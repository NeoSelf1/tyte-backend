import { DailyStat, Todo } from './models'
import { getBalanceMessage } from './utils'

export const updateDailyStats = async (date: string, userId: string) => {
  const todos = await Todo.find({ deadline: date, user: userId })
  const myNum = 0.4

  const availableTime = 480
  const DIFFICULTY_WEIGHT = 0.55
  const TIME_WEIGHT = 0.45
  const WORK_MULTIPLIER = 1.3
  const LIFE_MULTIPLIER = -0.4

  const tagCounts: any = {}

  if (todos.length == 0) {
    await DailyStat.findOneAndDelete({ date, user: userId })
  } else {
    let totalLoad = 0
    let totalEstimatedTime = 0
    let productivityNum = 0

    todos.forEach((todo) => {
      if (todo.tagId) {
        tagCounts[todo.tagId] = (tagCounts[todo.tagId] || 0) + 1
      }

      const difficultyLoad = (todo.difficulty / 5) * DIFFICULTY_WEIGHT
      const timeLoad = (todo.estimatedTime / availableTime) * TIME_WEIGHT
      const typeMultiplier = todo.isLife ? LIFE_MULTIPLIER : WORK_MULTIPLIER
      const todoLoad = (difficultyLoad + timeLoad) * typeMultiplier * myNum

      totalLoad += todoLoad
      totalEstimatedTime += todo.estimatedTime

      if (todo.isCompleted) {
        productivityNum +=
          (todo.difficulty / 5) * DIFFICULTY_WEIGHT * 50 + (todo.estimatedTime / availableTime) * TIME_WEIGHT * 30
      }
    })

    if (totalEstimatedTime > availableTime) {
      const overloadFactor = totalEstimatedTime / availableTime
      totalLoad *= overloadFactor
    }

    const tagStats = Object.entries(tagCounts)
      .map(([tagId, count]) => ({ tagId, count }))
      .sort((a: any, b: any) => b.count - a.count)

    const balanceNum = Math.max(Math.min(Math.round(totalLoad * 100), 100), 0)
    const balanceMessage = getBalanceMessage(balanceNum)

    const balanceData = {
      title: balanceMessage.title,
      message: balanceMessage.message,
      balanceNum,
    }
    const center = [Math.random() * 0.6 + 0.2, Math.random() * 0.6 + 0.2]
    console.log('DailyStats updated')

    await DailyStat.findOneAndUpdate(
      { date, user: userId },
      { $set: { balanceData, productivityNum: productivityNum.toFixed(2), tagStats, center } },
      { upsert: true, new: true },
    )
  }
}
