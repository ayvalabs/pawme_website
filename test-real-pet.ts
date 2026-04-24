// Test with a real cat image
async function testRealPetImage() {
  try {
    // Read the downloaded cat image
    const fs = await import('fs');
    const imageBuffer = fs.readFileSync('test-cat.jpg');
    
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('image', blob, 'test-cat.jpg');

    console.log('Testing with real cat image...');
    
    const response = await fetch('http://localhost:3008/api/analyze-pet-image', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response:', result);

    if (result.success && result.data) {
      console.log('\nPet Analysis Results:');
      console.log('=====================');
      console.log(`Breed: ${result.data.breed}`);
      console.log(`Type: ${result.data.type}`);
      console.log(`Color: ${result.data.color}`);
      console.log(`Estimated Age: ${result.data.estimatedAge}`);
      console.log(`Gender: ${result.data.gender}`);
      console.log(`Weight: ${result.data.weight}`);
      console.log(`Care Notes: ${result.data.careNotes}`);
      console.log(`Confidence: ${result.data.confidence}`);
      
      if (result.data.confidence > 0.5) {
        console.log('\nAPI is working correctly with high confidence!');
      } else {
        console.log('\nAPI detected an image but with low confidence.');
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testRealPetImage();
