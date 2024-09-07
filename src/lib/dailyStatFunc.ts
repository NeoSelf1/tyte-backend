import { DailyStat, Todo } from './models'
import { getBalanceMessage } from './utils'

interface Todo {
  title: string
  isImportant: boolean
  isLife: boolean
  difficulty: number
  estimatedTime: number
  deadline: string
  isCompleted: boolean
}

export const updateBalanceNumByDate = async (date: string) => {
  const todos = await Todo.find({ deadline: date })
  if (todos.length == 0) {
    await DailyStat.findOneAndDelete({ date })
  } else {
    const availableTime = 480
    const balanceNum = calculateBalanceNum(todos, availableTime)
    const balanceMessage = getBalanceMessage(balanceNum)
    const balanceData = {
      title: balanceMessage.title,
      message: balanceMessage.message,
      balanceNum,
    }

    const productivityData = {
      title: balanceMessage.title,
      message: balanceMessage.message,
      productivityNum: 22,
    }

    console.log('updateBalanceNumByDate:', date, '->', balanceNum)
    await DailyStat.findOneAndUpdate({ date }, { balanceData, productivityData }, { upsert: true, new: true })
  }
}

const calculateBalanceNum = (todos: Todo[], availableTime: number) => {
  // 기본 가중치 설정
  const myNum = 0.4

  const DIFFICULTY_WEIGHT = 0.55
  const TIME_WEIGHT = 0.45
  const WORK_MULTIPLIER = 1.3
  const LIFE_MULTIPLIER = -0.4

  let totalLoad = 0
  let totalEstimatedTime = 0

  todos.forEach((todo) => {
    const difficultyLoad = (todo.difficulty / 5) * DIFFICULTY_WEIGHT // < 0.4
    const timeLoad = (todo.estimatedTime / availableTime) * TIME_WEIGHT // 0.6 전후
    const typeMultiplier = todo.isLife ? LIFE_MULTIPLIER : WORK_MULTIPLIER // 1.2 or 0.8

    const todoLoad = (difficultyLoad + timeLoad) * typeMultiplier * myNum // todo당 1 전후
    totalLoad += todoLoad
    totalEstimatedTime += todo.estimatedTime
  })

  console.log('totalLoad:', totalLoad)
  // 총 예상 시간이 가용 시간을 초과하면 부하 지수를 증가 = 증가한 배수만큼 그대로 곱함
  if (totalEstimatedTime > availableTime) {
    const overloadFactor = totalEstimatedTime / availableTime
    totalLoad *= overloadFactor
  }

  // 0-100 범위로 정규화
  const loadIndex = Math.max(Math.min(Math.round(totalLoad * 100), 100), 0)

  return loadIndex
}
