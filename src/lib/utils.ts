import mongoose from 'mongoose'
require('dotenv').config()

interface Connection {
  isConnected?: any
}

const connection: Connection = {}

export const PORT = process.env.PORT || 3000

export const connectToDb = async (): Promise<void> => {
  try {
    if (connection.isConnected) {
      console.log('Using existing connection')
      return
    }
    const db = await mongoose.connect(process.env.MONGO as unknown as string)
    connection.isConnected = db.connections[0].readyState
  } catch (error: any) {
    console.log(error)
    throw new Error(error)
  }
}

export const getTodayDate = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][today.getDay()]
  console.log(`gettingTodayDateForGPT: ${year}-${month}-${day}-${dayOfWeek}`)
  return `${year}-${month}-${day}-${dayOfWeek}`
}

export const TodoCreateMessage = `
입력된 Todo 내용과 날짜를 분석하여 정확한 JSON을 생성하세요. 다음 지침을 엄격히 따르세요:

1. 입력 형식:
   날짜: YYYY-MM-DD-E
   내용: {Todo 내용}

2. 출력 형식: JSON 문자열

3. JSON 구조 및 규칙:
   a) 최상위 객체: { "isValid": boolean, "todos": [ ] }
   b) 각 Todo 객체: { title, isImportant, isLife, difficulty, estimatedTime, deadline }

   c) title (문자열):
      - "내일까지"와 같은 마감기한 관련 표현 제거
      - 느낌표가 있을 경우 느낌표 제거
      - 순수 Todo 내용만 포함

   d) isImportant (불린):
      - true: Todo 내용에 "!"가 포함된 경우
      - false: Todo 내용에 "!"가 포함되어있지 않은 경우

   e) isLife (불린):
      - true: 생활 관련 항목 (예: 운동, 식사, 개인 용무)
      - false: 업무 관련 항목

   f) difficulty (정수, 1-5):
      - 단순 반복 작업 또는 매우 쉬운 작업: 1
      - 약간의 집중이 필요한 일상적인 작업: 2
      - 평균적인 난이도의 작업: 3
      - 상당한 노력과 집중이 필요한 작업: 4
      - 매우 복잡하거나 도전적인 작업: 5

   g) estimatedTime (정수):
      - 분 단위, 10분 단위로 반올림

   h) deadline (문자열, YYYY-MM-DD 형식):
      - 일정 관련 표현에 맞는 정확한 날짜 반환
      - 일정 관련 표현 예시
          "다음 주 월요일": 다음 주 월요일에 해당하는 날짜
          "X일 후" 또는 "X일 뒤": 입력 날짜 + X일
      - 일정 관련 표현 없음: 입력 날짜

   i) 여러 Todo: 쉼표로 구분된 각 항목을 별도 객체로 처리

4. 오류 처리: 유효하지 않은 입력 시 { "isValid": false }

5. 예시 출력:
{
  "isValid": true,
  "todos": [
    {
      "title": "보고서 작성",
      "isImportant": true,
      "isLife": false,
      "difficulty": 4,
      "estimatedTime": 180,
      "deadline": "2024-09-10"
    },
    {
      "title": "운동",
      "isImportant": false,
      "isLife": true,
      "difficulty": 2,
      "estimatedTime": 60,
      "deadline": "2024-09-04"
    }
  ]
}

주어진 입력에 따라 위 규칙을 엄격히 준수하여 JSON만 생성하세요. 추가 설명은 하지 마세요.
`
