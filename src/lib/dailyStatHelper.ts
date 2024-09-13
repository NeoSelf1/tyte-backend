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

    todos.forEach((todo) => {
      if (todo.tagId) {
        // 여기서 tagId는 Populate된 Tag 객체가 아니고, tag의 Object ID 이다.
        tagCounts[todo.tagId] = (tagCounts[todo.tagId] || 0) + 1
      }
      const difficultyLoad = (todo.difficulty / 5) * DIFFICULTY_WEIGHT // < 0.4
      const timeLoad = (todo.estimatedTime / availableTime) * TIME_WEIGHT // 0.6 전후
      const typeMultiplier = todo.isLife ? LIFE_MULTIPLIER : WORK_MULTIPLIER // 1.2 or 0.8
      const todoLoad = (difficultyLoad + timeLoad) * typeMultiplier * myNum // todo당 1 전후

      totalLoad += todoLoad
      totalEstimatedTime += todo.estimatedTime
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
    const productivityNum = 22 // 추후 수정 필요

    const center = [Math.random() * 0.6 + 0.2, Math.random() * 0.6 + 0.2]
    console.log('DailyStats updated')
    // $set:{필드명 : value} 는 명시한 필드만 바꾸고, 나머지는 변경하지 않는다. 없을 경우 새로운 필드로 추가.
    // 만일 {tagStats}로 할 경우, find에 참고한 필드를 제외한 모든 필드들이 tagStats로 완전 대체된다.
    await DailyStat.findOneAndUpdate(
      { date, user: userId },
      { $set: { balanceData, productivityNum, tagStats, center } },
      { upsert: true, new: true },
    )
  }
}
