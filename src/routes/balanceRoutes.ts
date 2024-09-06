require('dotenv').config()

import express, { Request, Response } from 'express'
import { BalanceNum } from '../lib/models'
const balanceRouter = express.Router()
// 사진 내부, 정리가 필요한 물건과 해당 물건의 2차원 좌표를 반환

balanceRouter.get('/', async (req, res) => {
  try {
    // { date: 1 }는 'date' 필드를 기준으로 오름차순 정렬을 의미합니다.
    // '1'은 오름차순(ascending), '-1'은 내림차순(descending)을 나타냅니다.
    const balanceNums = await BalanceNum.find().sort({ date: 1 })
    // console.log('balanceNums:', balanceNums)
    res.json(balanceNums)
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})
export default balanceRouter
