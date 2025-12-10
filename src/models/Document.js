const { Schema, model, Types } = require('mongoose')

const documentSchema = new Schema(
  {
    owner: { type: Types.ObjectId, ref: 'User', required: true },
    client: { type: Types.ObjectId, ref: 'Client' },
    task: { type: Types.ObjectId, ref: 'Task' },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    mimeType: String,
    sizeBytes: Number,
    uploadedBy: { type: Types.ObjectId, ref: 'User' },
    tags: [String]
  },
  { timestamps: true }
)
const Document = model('Document', documentSchema)

module.exports ={Document}