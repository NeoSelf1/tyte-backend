import express, { Request, Response } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import multer, { Multer } from 'multer'

require('dotenv').config()
const coreRouter = express.Router()
//CLUADE_api_key
const anthropic = new Anthropic({
  apiKey: process.env.CLUADE_api_key,
})

const upload: Multer = multer({ storage: multer.memoryStorage() })

interface FileRequest extends Request {
  file?: Express.Multer.File
}
type ImageType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

// 사진 내부, 정리가 필요한 물건과 해당 물건의 2차원 좌표를 반환
coreRouter.post('/', upload.single('image'), async (req: FileRequest, res: Response) => {
  console.log('Calling Object Detection api...')
  try {
    if (!req.file) {
      return res.status(400).send({ message: 'No file uploaded.' })
    }
    const base64Image: string = req.file.buffer.toString('base64')
    // MIME 타입 결정
    let mimeType: string
    switch (req.file.mimetype) {
      case 'image/jpeg':
        mimeType = 'data:image/jpeg;base64,'
        break
      case 'image/png':
        mimeType = 'data:image/png;base64,'
        break
      default:
        mimeType = `data:${req.file.mimetype};base64,`
    }

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      system: `
You are an AI assistant specialized in analyzing images and identifying objects that need organization or tidying. Your task is to examine the provided image and provide a detailed analysis of items that appear cluttered, disorganized, or in need of tidying.

Please follow these steps to complete the task:
1. Carefully scan the entire image for objects that appear cluttered, disorganized, or in need of tidying.
2. For each identified object:
   a. Determine the name of the object.
   b. Identify the exact 2D coordinates for the center of the object in the image.
      Use a coordinate system where (0,0) is the top-left corner and (100,100) is the bottom-right corner.
3. Compile your findings into a JSON format response. Your response should only contain the JSON format, structured as follows:

{
  "items": [
    {
      "name": "Name of the object",
      "coordinates": [x, y],
    },
    // Additional items...
  ],
  "count": 0
}

Additional guidelines:
- If no items needing organization are found, return an empty list for "items" and set "count" to 0.
- Limit your analysis to a maximum of 5 items, prioritizing the most significant objects of disorganization.
- Ensure the "count" value accurately reflects the number of items in the "items" list.
- Do not include any explanations or text outside of the JSON format in your response.

Please proceed with the analysis and provide your response in the specified JSON format.
`,
      max_tokens: 1024,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: req.file.mimetype as ImageType,
                data: base64Image,
              },
            },
          ],
        },
        {
          role: 'assistant',
          content: [{ type: 'text', text: '{' }],
        },
      ],
    })

    console.log('API response received')
    if (message.content[0].type === 'text') {
      const result = JSON.parse('{' + message.content[0].text)

      console.log('API response successfully received.')
      res.status(201).json(result)
    } else {
      console.log('content type error, sending Empty Array.')
      res.status(201).json({ items: [], count: 0 })
    }
  } catch (error) {
    console.error('Error processing api call:', error, 'Sending Empty Array.')
    res.status(201).json({ items: [], count: 0 })
  }
})

export default coreRouter
