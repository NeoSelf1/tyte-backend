import express, { Express } from 'express'
import todoRouter from './routes/todoRoutes'
import { PORT } from './lib/utils'
import coreRouter from './routes/coreRoutes'
import balanceRouter from './routes/balanceRoutes'

const app: Express = express()
app.use(express.json())
app.use('/api/todo', todoRouter)
app.use('/api/balance', balanceRouter)

// 전달받은 사진 내부, 정리가 필요한 물건과 해당 물건의 2차원 좌표를 반환
// app.use('/api/recognize', coreRouter)

// 물건들의 3차원 좌표를 배열형태로 추가, 배열형태로 조회
// app.use('/api/item', itemRouter)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
