import express from 'express'
import dotenv from 'dotenv'
import todoRouter from './routes/todoRoutes'
import tagRouter from './routes/tagRoutes'
import authRouter from './routes/authRoutes'
import dailyStatRouter from './routes/dailyStatRoutes'

import { PORT } from './lib/utils'

dotenv.config()

const app = express()

app.use(express.json())
app.use('/api/auth', authRouter)
app.use('/api/todo', todoRouter)
app.use('/api/tag', tagRouter)
app.use('/api/dailyStat', dailyStatRouter)
// 전달받은 사진 내부, 정리가 필요한 물건과 해당 물건의 2차원 좌표를 반환
// app.use('/api/recognize', coreRouter)

// 물건들의 3차원 좌표를 배열형태로 추가, 배열형태로 조회
// app.use('/api/item', itemRouter)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
