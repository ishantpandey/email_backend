const { createRagChain } = require("./chains/rag.chain");

const { getVectorStore } = require("./vectorStore.service");


const askRag = async (question) => {

    const vectorStore = await getVectorStore();

    const retriever = vectorStore.asRetriever({

        k: 5,

    });

    const documents = await retriever.invoke(question);

    const context = documents
        .map((document, index) => {

            return `
Document ${index + 1}

Source Type:
${document.metadata?.sourceType}

Source:
${document.metadata?.source}

Page:
${document.metadata?.loc?.pageNumber || "N/A"}

Content:
${document.pageContent}
`;

        })
        .join("\n\n");

    const chain = createRagChain();

    const answer = await chain.invoke({

        context,

        question,

    });

    return {

        answer,

        sources: documents.map((document) => ({

            sourceType: document.metadata?.sourceType,

            source: document.metadata?.source,

            page: document.metadata?.loc?.pageNumber,

            content: document.pageContent,

        })),

    };

};

module.exports = {
    askRag,
};