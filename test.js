const { createEmbedding, createEmbeddings } = require("./service/ragService/embedding.service");
const dotenv = require("dotenv");
dotenv.config();

console.log(process.env.GEMINI_API_KEY);
async function testEmbedding() {
  try {
    // Test single embedding
    const embedding = await createEmbedding(
      "React is a JavaScript library."
    );
    console.log("✓ Single embedding:", embedding);

    // Test multiple embeddings
    const embeddings = await createEmbeddings([
      "React is a library",
      "Vue is a framework",
      "Angular is a platform"
    ]);
    console.log("✓ Multiple embeddings:", embeddings.length);
    
  } catch (error) {
    console.error("✗ Test failed:", error.message);
  }
}

testEmbedding();