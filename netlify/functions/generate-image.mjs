import fetch from 'node-fetch';

export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let fallbackUrl = null;

  try {
    const body = await req.json();
    const { formData } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const {
      activityName, whatIDo, sitePurpose, items, whyChooseMe,
      color1, color2, color3, siteFeel, preferredStyle,
      hasLogo, hasPhotos, talkingStyle, selfDescription, dislikes
    } = formData;

    const itemsList = items.filter(i => i.name).map(i => `${i.name} (${i.phrase})`).join(', ');

    const prompt = `Generate a professional, realistic mockup image of a modern website homepage for "${activityName}".
    
Website details:
- Business: ${whatIDo}
- Purpose: ${sitePurpose}
- Main offerings: ${itemsList}
- Value proposition: ${whyChooseMe}
- Color scheme: Primary ${color1}, Secondary ${color2}, Accent ${color3}
- Desired feel: ${siteFeel}
- Style preference: ${preferredStyle}
- Has logo: ${hasLogo}
- Has photos: ${hasPhotos}
- Communication tone: ${talkingStyle}
- Self-description: ${selfDescription}
- Dislikes: ${dislikes}

Create a complete website mockup showing the full homepage layout including navigation bar, hero section with the business name prominently displayed, product/service cards, about section, and contact area. The design should be modern, professional, and reflect the specified colors and style preferences. Show this as if viewed on a desktop or mobile browser.`;

    const normalizeColor = (color, fallback = 'cccccc') => {
      if (typeof color === 'string' && color.startsWith('#') && color.length === 7) {
        return color.substring(1);
      }
      return fallback;
    };

    fallbackUrl = `https://via.placeholder.com/1200x675/${normalizeColor(color1)}/${normalizeColor(color3, '333333')}?text=${encodeURIComponent(activityName.substring(0, 30))}`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorPayload = await response.text();
      throw new Error(`Gemini API error: ${errorPayload}`);
    }

    const result = await response.json();

    let imageData;

    for (const candidate of result.candidates ?? []) {
      for (const part of candidate.content?.parts ?? []) {
        if (part.inlineData?.data) {
          imageData = part.inlineData.data;
          break;
        }
      }
      if (imageData) {
        break;
      }
    }

    if (!imageData) {
      throw new Error('No image data in response');
    }

    const imageUrl = `data:image/png;base64,${imageData}`;

    return new Response(JSON.stringify({
      success: true,
      imageUrl
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating image:', error);

    if (fallbackUrl) {
      return new Response(JSON.stringify({
        success: true,
        imageUrl: fallbackUrl,
        fallback: true,
        message: 'Using placeholder - API configuration needed'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      fallback: true
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = {
  path: "/api/generate-image"
};
