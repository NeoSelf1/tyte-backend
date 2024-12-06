import express from 'express'
import mongoose from 'mongoose'
import { connectToDb } from '../lib/utils'
import { Friend, FriendRequest, User } from '../lib/models'
import { authMiddleware, AuthRequest } from '../lib/authMiddleware'

const socialRouter = express.Router()

socialRouter.use(authMiddleware)

// 유저 검색
socialRouter.get('/search/:query', async (req: AuthRequest, res) => {
  try {
    await connectToDb()
    const userId = req.user._id // 이미 ObjectId 형태임.
    const { query } = req.params

    if (!query) {
      return res.status(200).json([])
    }

    // 현재 사용자의 친구 목록 조회
    const friendships = await Friend.find({
      $or: [{ user1Id: userId }, { user2Id: userId }],
    })

    // 친구 ID 목록 생성
    const friendIds = friendships.map((friendship) => {
      return friendship.user1Id.equals(userId) ? friendship.user2Id : friendship.user1Id
    })

    // 검색 조건에 맞는 사용자 조회
    const users = await User.aggregate([
      {
        $match: {
          _id: { $ne: userId },
          username: {
            $regex: query,
            $options: 'i',
          },
        },
      },
      {
        $lookup: {
          from: 'friendrequests',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $or: [
                        {
                          $and: [
                            { $eq: [{ $toObjectId: '$fromUserId' }, '$$userId'] },
                            { $eq: [{ $toObjectId: '$toUserId' }, userId] },
                          ],
                        },
                        {
                          $and: [
                            { $eq: [{ $toObjectId: '$fromUserId' }, userId] },
                            { $eq: [{ $toObjectId: '$toUserId' }, '$$userId'] },
                          ],
                        },
                      ],
                    },
                    { $eq: ['$status', 'pending'] },
                  ],
                },
              },
            },
          ],
          as: 'friendRequest',
        },
      },
      {
        $project: {
          _id: { $toString: '$_id' },
          username: 1,
          email: 1,
          isFriend: {
            $in: ['$_id', friendIds],
          },
          isPending: {
            $cond: {
              if: { $gt: [{ $size: '$friendRequest' }, 0] },
              then: true,
              else: false,
            },
          },
          isIncoming: {
            $cond: {
              if: { $gt: [{ $size: '$friendRequest' }, 0] },
              then: {
                $let: {
                  vars: {
                    request: { $arrayElemAt: ['$friendRequest', 0] },
                  },
                  in: {
                    $eq: [{ $toObjectId: '$$request.toUserId' }, userId],
                  },
                },
              },
              else: false,
            },
          },
        },
      },
      {
        $limit: 20,
      },
    ])

    return res.status(200).json(users)
  } catch (error) {
    console.error('Error in searchUsers:', error)
    res.status(500).json()
  }
})

// 친구 목록 조회
socialRouter.get('/', async (req: AuthRequest, res) => {
  try {
    await connectToDb()
    const userId = req.user._id

    const friends = await Friend.aggregate([
      { $match: { $or: [{ user1Id: userId }, { user2Id: userId }] } },
      {
        $lookup: {
          from: 'users',
          let: {
            user1: '$user1Id',
            user2: '$user2Id',
            currentUser: userId,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $cond: {
                    if: { $eq: ['$$currentUser', '$$user1'] },
                    then: { $eq: ['$_id', '$$user2'] },
                    else: { $eq: ['$_id', '$$user1'] },
                  },
                },
              },
            },
          ],
          as: 'friendInfo',
        },
      },
      {
        $unwind: '$friendInfo',
      },
      {
        $project: {
          _id: { $toString: '$friendInfo._id' },
          username: '$friendInfo.username',
          email: '$friendInfo.email',
          createdAt: 1,
        },
      },
    ])

    return res.status(200).json(friends)
  } catch (error) {
    console.error('Error in getFriends:', error)
    res.status(500).json()
  }
})

// 친구 요청 보내기
socialRouter.post('/request/:userId', async (req: AuthRequest, res) => {
  try {
    const userId = req.user._id
    const toUserId = req.params.userId
    await connectToDb()

    if (userId === toUserId) {
      console.log('자기 자신에게 요청')
      return res.status(400).json()
    }

    const existingFriend = await Friend.findOne({
      $or: [
        { user1Id: req.user._id, user2Id: toUserId },
        { user1Id: toUserId, user2Id: req.user._id },
      ],
    })

    if (existingFriend) {
      console.log('이미 친구 관계')
      return res.status(405).json()
    }

    const existingRequest = await FriendRequest.findOne({
      fromUserId: req.user._id,
      toUserId: toUserId,
      status: 'pending',
    })

    if (existingRequest) {
      console.log('이미 친구 요청을 보냄')
      return res.status(400).json()
    }

    // 새 친구 요청 생성
    const friendRequest = new FriendRequest({
      fromUserId: req.user._id,
      toUserId: toUserId,
      status: 'pending',
    })

    await friendRequest.save()

    res.status(200).json({ id: toUserId })
  } catch (error) {
    console.error('Error in sendFriendRequest:', error)
    res.status(500).json()
  }
})

// 친구 요청 수락
socialRouter.patch('/accept/:requestId', async (req: AuthRequest, res) => {
  try {
    await connectToDb()
    const friendRequest = await FriendRequest.findOne({
      _id: req.params.requestId,
      toUserId: req.user._id,
      status: 'pending',
    })

    if (!friendRequest) {
      return res.status(403).json()
    }

    const friend = new Friend({
      user1Id: friendRequest.fromUserId,
      user2Id: friendRequest.toUserId,
      createdAt: new Date(),
    })

    await friend.save()

    friendRequest.status = 'accepted'
    await friendRequest.save()

    res.status(200).json({ id: friendRequest.toUserId })
  } catch (error) {
    console.error('Error in acceptFriendRequest:', error)
    res.status(500).json()
  }
})

// 친구 요청 거절
socialRouter.patch('/reject/:requestId', async (req: AuthRequest, res) => {
  try {
    await connectToDb()
    const friendRequest = await FriendRequest.findOne({
      _id: req.params.requestId,
      toUserId: req.user._id,
      status: 'pending',
    })

    if (!friendRequest) {
      return res.status(404).json()
    }

    friendRequest.status = 'rejected'
    await friendRequest.save()

    return res.status(200).json()
  } catch (error) {
    console.error('Error in rejectFriendRequest:', error)
    res.status(500).json()
  }
})

// 받은 친구 요청 목록 조회
socialRouter.get('/requests/pending', async (req: AuthRequest, res) => {
  try {
    await connectToDb()
    const pendingRequests = await FriendRequest.aggregate([
      {
        $match: {
          toUserId: req.user._id,
          status: 'pending',
        },
      },
      {
        $lookup: {
          from: 'users',
          let: { fromUserId: '$fromUserId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', { $toObjectId: '$$fromUserId' }],
                },
              },
            },
            {
              $project: {
                _id: { $toString: '$_id' },
                username: 1,
                email: 1,
              },
            },
          ],
          as: 'fromUser',
        },
      },
      {
        $unwind: '$fromUser',
      },
      {
        $project: {
          _id: { $toString: '$_id' },
          fromUser: 1,
          status: 1,
        },
      },
    ])
    return res.status(200).json(pendingRequests)
  } catch (error) {
    console.error('Error in getPendingRequests:', error)
    res.status(500).json()
  }
})

// 친구 삭제
socialRouter.delete('/:userId', async (req: AuthRequest, res) => {
  try {
    const result = await Friend.deleteOne({
      $or: [
        { user1Id: req.user._id, user2Id: req.params.userId },
        { user1Id: req.params.userId, user2Id: req.user._id },
      ],
    })

    if (result.deletedCount === 0) {
      return res.status(403).json()
    }

    return res.status(200).json()
  } catch (error) {
    console.error('Error in removeFriend:', error)
    res.status(500).json()
  }
})

export default socialRouter
