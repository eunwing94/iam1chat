const { DirectoryLoader } = require("langchain/document_loaders/fs/directory");
const { TextLoader } = require("langchain/document_loaders/fs/text");
const { PDFLoader } = require("langchain/document_loaders/fs/pdf");
const { DocxLoader } = require("langchain/document_loaders/fs/docx");
const { OpenAIEmbeddings, ChatOpenAI } = require("@langchain/openai");
const { MemoryVectorStore } = require("langchain/vectorstores/memory");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { createRetrievalChain } = require("langchain/chains/retrieval");
const { createHistoryAwareRetriever } = require("langchain/chains/history_aware_retriever");
const { MessagesPlaceholder } = require("@langchain/core/prompts");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { createStuffDocumentsChain } = require("langchain/chains/combine_documents");
const { calculateConfidence } = require('./confidence.js');

let retrievalChain;
let chatHistory = [];
let isRetraining = false;

async function initializeKnowledgeBase() {
  try {
    const loader = new DirectoryLoader(
      "./manuals",
      {
        ".pdf": (path) => new PDFLoader(path, { splitPages: false }),
        ".docx": (path) => new DocxLoader(path),
        ".txt": (path) => new TextLoader(path),
      },
      true // recursive
    );
    const docs = await loader.load();

    if (docs.length === 0) {
      console.log("학습할 문서가 manuals 폴더에 없습니다.");
      return;
    }

    const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
    const splitDocs = await textSplitter.splitDocuments(docs);

    const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY });
    const vectorstore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);

    const retriever = vectorstore.asRetriever({ k: 4 });
    const llm = new ChatOpenAI({ modelName: "gpt-4o", temperature: 0.1 });

    const historyAwarePrompt = ChatPromptTemplate.fromMessages([
      new MessagesPlaceholder("chat_history"),
      ["user", "{input}"],
      ["user", "Given the above conversation, generate a search query to look up in order to get information relevant to the conversation"],
    ]);

    const historyAwareRetrieverChain = await createHistoryAwareRetriever({
      llm,
      retriever,
      rephrasePrompt: historyAwarePrompt,
    });

    const historyAwareRetrievalPrompt = ChatPromptTemplate.fromMessages([
      ["system", "You are Mr.FILA, an AI assistant for answering questions about FILA ERP. You are a helpful and enthusiastic assistant who is an expert in all things about FILA ERP. Use the following pieces of retrieved context to answer the user's question. If you don't know the answer, just say that you don't know. Use three sentences maximum and keep the answer concise, and answer in Korean.\n\n{context}"],
      new MessagesPlaceholder("chat_history"),
      ["user", "{input}"],
    ]);

    const historyAwareCombineDocsChain = await createStuffDocumentsChain({
      llm,
      prompt: historyAwareRetrievalPrompt,
    });

    retrievalChain = await createRetrievalChain({
      retriever: historyAwareRetrieverChain,
      combineDocsChain: historyAwareCombineDocsChain,
    });

    console.log(`✅ ${docs.length}개의 문서를 학습하고 RAG 체인 초기화를 완료했습니다!`);

  } catch (error) {
    console.error("🚨 문서 학습 중 에러 발생:", error);
  }
}

async function getAnswer(question) {
  if (!retrievalChain) {
    return {
      answer: "문서가 아직 학습되지 않았습니다. manuals 폴더에 문서를 추가하고 서버를 재시작하세요.",
      confidence: 0,
      sources: []
    };
  }
  try {
    const response = await retrievalChain.invoke({
      chat_history: chatHistory,
      input: question,
    });
    
    // 신뢰도 계산
    const confidence = calculateConfidence(response, question);
    
    // 소스 문서 정보 추출
    const sources = extractSources(response);
    
    chatHistory.push({ role: 'user', content: question });
    chatHistory.push({ role: 'assistant', content: response.answer });
    // Keep chat history to a reasonable size
    if (chatHistory.length > 10) {
      chatHistory = chatHistory.slice(-10);
    }
    
    return {
      answer: response.answer,
      confidence: confidence,
      sources: sources
    };
  } catch (error) {
    console.error("🚨 답변 생성 중 에러 발생:", error);
    return {
      answer: "답변을 생성하는 중 오류가 발생했습니다.",
      confidence: 0,
      sources: []
    };
  }
}

// 소스 문서 정보 추출 함수
function extractSources(response) {
  if (!response.context || response.context.length === 0) {
    return [];
  }
  
  return response.context.map((doc, index) => ({
    id: index + 1,
    source: doc.metadata?.source || "알 수 없는 소스",
    content: doc.pageContent?.substring(0, 200) + "..." || "",
    relevance: "관련 문서"
  }));
}

// RAG 재학습 함수
async function retrainRAG() {
  if (isRetraining) {
    console.log('🔄 RAG 재학습이 이미 진행 중입니다...');
    return;
  }

  isRetraining = true;
  console.log('🔄 RAG 재학습을 시작합니다...');

  try {
    // 기존 retrievalChain 초기화
    retrievalChain = null;
    
    // 새로운 지식 베이스 초기화
    await initializeKnowledgeBase();
    
    console.log('✅ RAG 재학습이 완료되었습니다!');
  } catch (error) {
    console.error('❌ RAG 재학습 실패:', error);
  } finally {
    isRetraining = false;
  }
}

module.exports = { 
  initializeKnowledgeBase, 
  getAnswer, 
  retrainRAG 
};