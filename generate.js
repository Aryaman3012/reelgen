const path = require('path');
const fs = require('fs-extra');
const userText = fs.readFileSync('./userText.txt', 'utf8');

// Import the compiled JS
const { processUserText } = require('./dist/main');
const { concatenateVideos } = require('./dist/service/video');

// Function to split text into 4000-char chunks
function splitTextIntoChunks(text, maxLen = 4000) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + maxLen));
    i += maxLen;
  }
  return chunks;
}

// Generate a unique runId for this script execution
const runId = new Date().toISOString().replace(/[-:.TZ]/g, '');

async function main() {
  const chunks = splitTextIntoChunks(userText, 4000);
  const allChunkPaths = [];
  const outputDir = path.join(__dirname, 'output', 'videos', runId);
  await fs.ensureDir(outputDir);

  for (let idx = 0; idx < chunks.length; idx++) {
    const chunk = chunks[idx];
    const inputTextId = `demo-input-id-chunk${idx+1}`;
    try {
      // Generate chunk and get result (array of chunk objects with filePath)
      const result = await processUserText(chunk, inputTextId, outputDir);
      if (Array.isArray(result)) {
        for (const v of result) {
          allChunkPaths.push(v.filePath);
        }
      }
      console.log(`Video generation result for chunk ${idx+1}:`, result);
    } catch (err) {
      console.error(`Error for chunk ${idx+1}:`, err);
    }
  }

  // After all runs, concatenate all chunk files into a single final video
  if (allChunkPaths.length > 0) {
    const finalOutput = path.join(outputDir, 'final_output.mp4');
    // Use concatenateVideos to join all chunks
    await concatenateVideos(path.dirname(allChunkPaths[0]), finalOutput);
    console.log('Final concatenated video at:', finalOutput);
    
    // Store information about the generated files
    const outputInfo = {
      finalVideo: finalOutput,
      chunks: allChunkPaths,
      createdAt: new Date().toISOString(),
      runId
    };
    await fs.writeJson(path.join(outputDir, 'output_info.json'), outputInfo, { spaces: 2 });
    console.log('Output information stored in:', path.join(outputDir, 'output_info.json'));
  } else {
    console.log('No video chunks found to concatenate.');
  }
}

main();
