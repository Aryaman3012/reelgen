const axios = require('axios');
const fs = require('fs');
const readline = require('readline');


async function getReels() {
  try {
    const response = await axios.get(`http://localhost:3000/api/reels?inputTextId=text-1746704341895`);
    const reels = response.data.reels;
    if (!reels || reels.length === 0) {
      console.log('No reels found for this inputTextId.');
      return;
    }
    // Save the first video with videoData
    const firstWithVideo = reels.find(r => r.videoData);
    if (!firstWithVideo) {
      console.log('No video attachments found for this inputTextId.');
      return;
    }
    const buffer = Buffer.from(firstWithVideo.videoData, 'base64');
    const filename = firstWithVideo.attachmentName || 'output.mp4';
    fs.writeFileSync(filename, buffer);
    console.log(`Saved video to ${filename}`);
  } catch (err) {
    console.error('Error fetching reels:', err.message);
  }
}

getReels();