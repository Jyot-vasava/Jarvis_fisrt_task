import { Schema, model } from "mongoose";

export interface Module {
  moduleName: string;
  action: string;
  description?: string;
  isDeleted: boolean;
}

const ModuleSchema = new Schema<Module>(
  {
    moduleName: {
      type: String,
      required: true,
      trim: true
    },
    action: {
      type: String,
      required: true,
      trim: true
    },isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Create compound index to ensure unique combination of moduleName and action
ModuleSchema.index({ moduleName: 1, action: 1 }, { unique: true });

export const ModuleModel = model<Module>("Module", ModuleSchema);