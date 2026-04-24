// Test with a smaller image
async function testSmallImage() {
  try {
    // Read the small test image
    const fs = await import('fs');
    const imageBuffer = fs.readFileSync('small-test.jpg');
    
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('image', blob, 'small-test.jpg');

    console.log('Testing with small image (200x200)...');
    
    const response = await fetch('http://localhost:3008/api/analyze-pet-image', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response:', result);

    if (result.success && result.data) {
      console.log('\nResult:', result.data);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSmallImage();
