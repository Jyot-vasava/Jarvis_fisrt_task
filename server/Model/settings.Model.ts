import mongoose, { Document } from 'mongoose';

export interface ISettings extends Document {
  allowFileTypes: string[];
  maxFileSize: number;
}

const SettingsSchema = new mongoose.Schema<ISettings>({
  allowFileTypes: {
    type: [String], 
    required: true
  },
  maxFileSize: {
    type: Number, 
    required: true, 
  }
}, { timestamps: true });

const Settings = mongoose.model<ISettings>("Settings", SettingsSchema);

export default Settings;