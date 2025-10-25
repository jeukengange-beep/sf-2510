import fetch from 'node-fetch';

export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

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

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [
          {
            prompt: prompt,
          }
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: '16:9',
          safetyFilterLevel: 'block_some',
          personGeneration: 'allow_adult',
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', errorData);
      
      const fallbackUrl = `https://via.placeholder.com/1200x675/${color1.substring(1)}/${color3.substring(1)}?text=${encodeURIComponent(activityName.substring(0, 30))}`;
      
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

    const result = await response.json();
    
    const imageData = result.predictions?.[0]?.bytesBase64Encoded;
    
    if (imageData) {
      const imageUrl = `data:image/png;base64,${imageData}`;
      
      return new Response(JSON.stringify({
        success: true,
        imageUrl: imageUrl
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      throw new Error('No image data in response');
    }

  } catch (error) {
    console.error('Error generating image:', error);
    
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
