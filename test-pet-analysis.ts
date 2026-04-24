import fs from 'fs';

// Test the analyze-pet-image API
async function testPetAnalysis() {
  try {
    // Create a simple test image (1x1 pixel PNG)
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    // Create a Blob from the buffer
    const blob = new Blob([testImageBuffer], { type: 'image/png' });
    
    const formData = new FormData();
    formData.append('image', blob, 'test.png');

    console.log('Testing analyze-pet-image API...');
    
    const response = await fetch('http://localhost:3008/api/analyze-pet-image', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response:', result);

    if (result.success && result.data) {
      console.log('\nAnalysis result:');
      console.log('- Breed:', result.data.breed);
      console.log('- Type:', result.data.type);
      console.log('- Color:', result.data.color);
      console.log('- Estimated Age:', result.data.estimatedAge);
      console.log('- Gender:', result.data.gender);
      console.log('- Weight:', result.data.weight);
      console.log('- Care Notes:', result.data.careNotes);
      console.log('- Confidence:', result.data.confidence);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Test Gemini API directly
async function testGeminiDirect() {
  const GEMINI_API_KEY = 'AIzaSyDogvV0S30jRYOHQ9g27srEYErTq34yuKI';
  
  console.log('\nTesting Gemini API directly...');
  
  const endpoints = [
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Respond with "API working" if you can read this.'
            }]
          }]
        }),
      });

      console.log(`\nEndpoint: ${url.split('/models/')[1].split(':')[0]}`);
      console.log('Status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
        console.log('Response:', text);
      } else {
        const error = await response.text();
        console.log('Error:', error);
      }
    } catch (error) {
      console.log(`Failed: ${error.message}`);
    }
  }
}

async function main() {
  await testGeminiDirect();
  await testPetAnalysis();
}

main().catch(console.error);
