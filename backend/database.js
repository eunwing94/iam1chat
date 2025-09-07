const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 데이터베이스 파일 경로
const DB_PATH = path.join(__dirname, 'chat_history.db');

class Database {
  constructor() {
    this.db = null;
  }

  // 데이터베이스 연결 및 초기화
  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('❌ 데이터베이스 연결 실패:', err.message);
          reject(err);
        } else {
          console.log('✅ SQLite 데이터베이스 연결 성공');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  // 테이블 생성
  async createTables() {
    return new Promise((resolve, reject) => {
      const createChatHistoryTable = `
        CREATE TABLE IF NOT EXISTS chat_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL,
          user_question TEXT NOT NULL,
          ai_answer TEXT NOT NULL,
          confidence INTEGER NOT NULL,
          confidence_level TEXT NOT NULL,
          sources_count INTEGER DEFAULT 0,
          learned_status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createSourcesTable = `
        CREATE TABLE IF NOT EXISTS chat_sources (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chat_id INTEGER NOT NULL,
          source_name TEXT NOT NULL,
          source_content TEXT,
          relevance TEXT DEFAULT '관련 문서',
          FOREIGN KEY (chat_id) REFERENCES chat_history (id) ON DELETE CASCADE
        )
      `;

      const createLowConfidenceAlertsTable = `
        CREATE TABLE IF NOT EXISTS low_confidence_alerts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chat_id INTEGER NOT NULL,
          teams_notification_sent BOOLEAN DEFAULT FALSE,
          notification_sent_at DATETIME,
          FOREIGN KEY (chat_id) REFERENCES chat_history (id) ON DELETE CASCADE
        )
      `;

      const createLearnedAnswersTable = `
        CREATE TABLE IF NOT EXISTS learned_answers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chat_id INTEGER NOT NULL,
          correct_answer TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chat_id) REFERENCES chat_history (id) ON DELETE CASCADE
        )
      `;

      this.db.serialize(() => {
        this.db.run(createChatHistoryTable, (err) => {
          if (err) {
            console.error('❌ chat_history 테이블 생성 실패:', err.message);
            reject(err);
            return;
          }
          console.log('✅ chat_history 테이블 생성 완료');
        });

        this.db.run(createSourcesTable, (err) => {
          if (err) {
            console.error('❌ chat_sources 테이블 생성 실패:', err.message);
            reject(err);
            return;
          }
          console.log('✅ chat_sources 테이블 생성 완료');
        });

        this.db.run(createLowConfidenceAlertsTable, (err) => {
          if (err) {
            console.error('❌ low_confidence_alerts 테이블 생성 실패:', err.message);
            reject(err);
            return;
          }
          console.log('✅ low_confidence_alerts 테이블 생성 완료');
        });

        this.db.run(createLearnedAnswersTable, (err) => {
          if (err) {
            console.error('❌ learned_answers 테이블 생성 실패:', err.message);
            reject(err);
            return;
          }
          console.log('✅ learned_answers 테이블 생성 완료');
          this.addLearnedStatusColumn().then(resolve).catch(reject);
        });
      });
    });
  }

  // learned_status 컬럼 추가 (기존 테이블 마이그레이션)
  async addLearnedStatusColumn() {
    return new Promise((resolve, reject) => {
      // 컬럼이 이미 존재하는지 확인
      this.db.get("PRAGMA table_info(chat_history)", (err, row) => {
        if (err) {
          console.error('❌ 테이블 정보 조회 실패:', err.message);
          reject(err);
          return;
        }

        // learned_status 컬럼이 있는지 확인
        this.db.all("PRAGMA table_info(chat_history)", (err, columns) => {
          if (err) {
            console.error('❌ 테이블 컬럼 정보 조회 실패:', err.message);
            reject(err);
            return;
          }

          const hasLearnedStatus = columns.some(col => col.name === 'learned_status');
          
          if (!hasLearnedStatus) {
            // learned_status 컬럼 추가
            this.db.run("ALTER TABLE chat_history ADD COLUMN learned_status TEXT DEFAULT 'pending'", (err) => {
              if (err) {
                console.error('❌ learned_status 컬럼 추가 실패:', err.message);
                reject(err);
                return;
              }
              console.log('✅ learned_status 컬럼 추가 완료');
              resolve();
            });
          } else {
            console.log('✅ learned_status 컬럼이 이미 존재합니다');
            resolve();
          }
        });
      });
    });
  }

  // 채팅 기록 저장
  async saveChatHistory(sessionId, userQuestion, aiAnswer, confidence, confidenceLevel, sources) {
    return new Promise((resolve, reject) => {
      const db = this.db; // this.db를 변수에 저장
      
      const insertChat = `
        INSERT INTO chat_history (session_id, user_question, ai_answer, confidence, confidence_level, sources_count)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      db.run(insertChat, [sessionId, userQuestion, aiAnswer, confidence, confidenceLevel, sources.length], function(err) {
        if (err) {
          console.error('❌ 채팅 기록 저장 실패:', err.message);
          reject(err);
          return;
        }

        const chatId = this.lastID;
        console.log(`✅ 채팅 기록 저장 완료 - ID: ${chatId}`);

        // 소스 정보 저장
        if (sources.length > 0) {
          const insertSource = `
            INSERT INTO chat_sources (chat_id, source_name, source_content, relevance)
            VALUES (?, ?, ?, ?)
          `;

          sources.forEach((source, index) => {
            db.run(insertSource, [chatId, source.source, source.content, source.relevance], (err) => {
              if (err) {
                console.error(`❌ 소스 ${index + 1} 저장 실패:`, err.message);
              } else {
                console.log(`✅ 소스 ${index + 1} 저장 완료`);
              }
            });
          });
        }

        resolve(chatId);
      });
    });
  }

  // 낮은 신뢰도 알림 기록 저장
  async saveLowConfidenceAlert(chatId, teamsNotificationSent = false) {
    return new Promise((resolve, reject) => {
      const insertAlert = `
        INSERT INTO low_confidence_alerts (chat_id, teams_notification_sent, notification_sent_at)
        VALUES (?, ?, ?)
      `;

      const notificationSentAt = teamsNotificationSent ? new Date().toISOString() : null;

      this.db.run(insertAlert, [chatId, teamsNotificationSent, notificationSentAt], function(err) {
        if (err) {
          console.error('❌ 낮은 신뢰도 알림 기록 저장 실패:', err.message);
          reject(err);
          return;
        }
        console.log(`✅ 낮은 신뢰도 알림 기록 저장 완료 - Chat ID: ${chatId}`);
        resolve(this.lastID);
      });
    });
  }

  // 채팅 기록 조회 (최근 N개)
  async getRecentChatHistory(limit = 50) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          ch.id,
          ch.session_id,
          ch.user_question,
          ch.ai_answer,
          ch.confidence,
          ch.confidence_level,
          ch.sources_count,
          ch.learned_status,
          ch.created_at,
          GROUP_CONCAT(cs.source_name, '|') as sources
        FROM chat_history ch
        LEFT JOIN chat_sources cs ON ch.id = cs.chat_id
        GROUP BY ch.id
        ORDER BY ch.created_at DESC
        LIMIT ?
      `;

      this.db.all(query, [limit], (err, rows) => {
        if (err) {
          console.error('❌ 채팅 기록 조회 실패:', err.message);
          reject(err);
          return;
        }

        const formattedRows = rows.map(row => ({
          id: row.id,
          sessionId: row.session_id,
          userQuestion: row.user_question,
          aiAnswer: row.ai_answer,
          confidence: row.confidence,
          confidenceLevel: row.confidence_level,
          sourcesCount: row.sources_count,
          learnedStatus: row.learned_status || 'pending',
          createdAt: row.created_at,
          sources: row.sources ? row.sources.split('|') : []
        }));

        resolve(formattedRows);
      });
    });
  }

  // 낮은 신뢰도 통계 조회
  async getLowConfidenceStats() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          COUNT(*) as total_low_confidence,
          AVG(confidence) as avg_confidence,
          COUNT(CASE WHEN lca.teams_notification_sent = 1 THEN 1 END) as notifications_sent
        FROM chat_history ch
        LEFT JOIN low_confidence_alerts lca ON ch.id = lca.chat_id
        WHERE ch.confidence <= 60
      `;

      this.db.get(query, (err, row) => {
        if (err) {
          console.error('❌ 낮은 신뢰도 통계 조회 실패:', err.message);
          reject(err);
          return;
        }

        resolve({
          totalLowConfidence: row.total_low_confidence || 0,
          averageConfidence: Math.round(row.avg_confidence || 0),
          notificationsSent: row.notifications_sent || 0
        });
      });
    });
  }

  // 답변 학습 저장
  async saveLearnedAnswer(chatId, correctAnswer) {
    return new Promise((resolve, reject) => {
      const db = this.db; // this.db를 변수에 저장
      
      db.serialize(() => {
        // learned_answers 테이블에 정확한 답변 저장
        const insertLearnedAnswer = `
          INSERT INTO learned_answers (chat_id, correct_answer)
          VALUES (?, ?)
        `;

        db.run(insertLearnedAnswer, [chatId, correctAnswer], function(err) {
          if (err) {
            console.error('❌ 학습된 답변 저장 실패:', err.message);
            reject(err);
            return;
          }

          console.log(`✅ 학습된 답변 저장 완료 - Chat ID: ${chatId}`);

          // chat_history 테이블의 learned_status를 'learned'로 업데이트
          const updateChatStatus = `
            UPDATE chat_history 
            SET learned_status = 'learned' 
            WHERE id = ?
          `;

          db.run(updateChatStatus, [chatId], function(err) {
            if (err) {
              console.error('❌ 채팅 상태 업데이트 실패:', err.message);
              reject(err);
              return;
            }

            console.log(`✅ 채팅 상태 업데이트 완료 - Chat ID: ${chatId}, Status: learned`);
            
            // qna.txt 파일 업데이트 및 RAG 재학습
            this.updateQnaFile(chatId, correctAnswer).then(() => {
              // RAG 재학습 호출
              this.retrainRAG().then(() => {
                resolve(this.lastID);
              }).catch(retrainErr => {
                console.error('❌ RAG 재학습 실패:', retrainErr);
                resolve(this.lastID); // RAG 재학습 실패해도 답변 저장은 성공으로 처리
              });
            }).catch(updateErr => {
              console.error('❌ QNA 파일 업데이트 실패:', updateErr);
              resolve(this.lastID); // QNA 파일 업데이트 실패해도 답변 저장은 성공으로 처리
            });
          }.bind(this));
        }.bind(this));
      });
    });
  }

  // RAG 재학습 호출
  async retrainRAG() {
    try {
      const { retrainRAG } = require('./knowledge.js');
      await retrainRAG();
    } catch (error) {
      console.error('❌ RAG 재학습 호출 실패:', error);
      throw error;
    }
  }

  // QNA 파일 업데이트 (새 답변 추가)
  async updateQnaFile(chatId, correctAnswer) {
    return new Promise((resolve, reject) => {
      // 해당 채팅의 질문 조회
      const query = `SELECT user_question FROM chat_history WHERE id = ?`;
      
      this.db.get(query, [chatId], (err, row) => {
        if (err) {
          console.error('❌ 질문 조회 실패:', err.message);
          reject(err);
          return;
        }

        if (!row) {
          console.error('❌ 해당 채팅을 찾을 수 없습니다:', chatId);
          reject(new Error('Chat not found'));
          return;
        }

        const userQuestion = row.user_question;
        const qnaFilePath = path.join(__dirname, 'manuals', 'qna.txt');
        
        // 새로운 Q&A 항목 생성
        const newQnaEntry = `\n## Q: ${userQuestion}\nA: ${correctAnswer}\n`;
        
        // 파일에 추가
        fs.appendFile(qnaFilePath, newQnaEntry, 'utf8', (err) => {
          if (err) {
            console.error('❌ QNA 파일 업데이트 실패:', err.message);
            reject(err);
            return;
          }
          
          console.log(`✅ QNA 파일 업데이트 완료 - Chat ID: ${chatId}`);
          resolve();
        });
      });
    });
  }

  // QNA 파일 업데이트 (답변 수정)
  async updateQnaFileOnEdit(chatId, userQuestion, newAnswer) {
    return new Promise((resolve, reject) => {
      const qnaFilePath = path.join(__dirname, 'manuals', 'qna.txt');
      
      // 기존 파일 읽기
      fs.readFile(qnaFilePath, 'utf8', (err, data) => {
        if (err) {
          console.error('❌ QNA 파일 읽기 실패:', err.message);
          reject(err);
          return;
        }

        // 해당 질문에 대한 모든 답변을 찾아서 업데이트
        const lines = data.split('\n');
        let updatedLines = [];
        let inTargetSection = false;
        let foundTarget = false;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // 질문 라인을 찾았을 때
          if (line.includes(`## Q: ${userQuestion}`)) {
            inTargetSection = true;
            updatedLines.push(line);
            continue;
          }
          
          // 답변 라인을 찾았을 때
          if (inTargetSection && line.startsWith('A: ')) {
            // 새로운 답변으로 교체
            updatedLines.push(`A: ${newAnswer}`);
            foundTarget = true;
            inTargetSection = false;
            continue;
          }
          
          // 다른 질문 섹션이 시작되면 현재 섹션 종료
          if (inTargetSection && line.startsWith('## Q:')) {
            inTargetSection = false;
          }
          
          updatedLines.push(line);
        }

        // 파일에 쓰기
        const updatedContent = updatedLines.join('\n');
        fs.writeFile(qnaFilePath, updatedContent, 'utf8', (err) => {
          if (err) {
            console.error('❌ QNA 파일 수정 실패:', err.message);
            reject(err);
            return;
          }
          
          if (foundTarget) {
            console.log(`✅ QNA 파일 수정 완료 - Chat ID: ${chatId}`);
          } else {
            console.log(`⚠️ QNA 파일에서 해당 질문을 찾을 수 없음 - Chat ID: ${chatId}`);
          }
          resolve();
        });
      });
    });
  }

  // 학습된 답변 조회
  async getLearnedAnswers(chatId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          la.id,
          la.correct_answer,
          la.created_at,
          ch.user_question
        FROM learned_answers la
        JOIN chat_history ch ON la.chat_id = ch.id
        WHERE la.chat_id = ?
        ORDER BY la.created_at ASC
      `;

      this.db.all(query, [chatId], (err, rows) => {
        if (err) {
          console.error('❌ 학습된 답변 조회 실패:', err.message);
          reject(err);
          return;
        }

        const formattedRows = rows.map(row => ({
          id: row.id,
          question: row.user_question,
          answer: row.correct_answer,
          createdAt: row.created_at
        }));

        resolve(formattedRows);
      });
    });
  }

  // 학습된 답변 수정
  async updateLearnedAnswer(learnedAnswerId, newAnswer) {
    return new Promise((resolve, reject) => {
      const db = this.db;
      
      // 먼저 해당 답변의 chat_id와 질문을 조회
      const selectQuery = `
        SELECT la.chat_id, ch.user_question 
        FROM learned_answers la
        JOIN chat_history ch ON la.chat_id = ch.id
        WHERE la.id = ?
      `;

      db.get(selectQuery, [learnedAnswerId], (err, row) => {
        if (err) {
          console.error('❌ 학습된 답변 정보 조회 실패:', err.message);
          reject(err);
          return;
        }

        if (!row) {
          console.error('❌ 해당 학습된 답변을 찾을 수 없습니다:', learnedAnswerId);
          reject(new Error('Learned answer not found'));
          return;
        }

        // 답변 업데이트
        const updateQuery = `
          UPDATE learned_answers 
          SET correct_answer = ?
          WHERE id = ?
        `;

        db.run(updateQuery, [newAnswer, learnedAnswerId], function(err) {
          if (err) {
            console.error('❌ 학습된 답변 수정 실패:', err.message);
            reject(err);
            return;
          }

          console.log(`✅ 학습된 답변 수정 완료 - ID: ${learnedAnswerId}`);

          // qna.txt 파일 업데이트 및 RAG 재학습
          this.updateQnaFileOnEdit(row.chat_id, row.user_question, newAnswer).then(() => {
            // RAG 재학습 호출
            this.retrainRAG().then(() => {
              resolve(this.changes);
            }).catch(retrainErr => {
              console.error('❌ RAG 재학습 실패:', retrainErr);
              resolve(this.changes); // RAG 재학습 실패해도 답변 수정은 성공으로 처리
            });
          }).catch(updateErr => {
            console.error('❌ QNA 파일 업데이트 실패:', updateErr);
            resolve(this.changes); // QNA 파일 업데이트 실패해도 답변 수정은 성공으로 처리
          });
        }.bind(this));
      });
    });
  }

  // 데이터베이스 연결 종료
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('❌ 데이터베이스 연결 종료 실패:', err.message);
        } else {
          console.log('✅ 데이터베이스 연결 종료');
        }
      });
    }
  }
}

// 싱글톤 인스턴스
const database = new Database();

module.exports = database;
