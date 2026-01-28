import { Schema, model, Types } from "mongoose";

export interface User {
  userName: string;
  email: string;
  password: string;
  roleId: Types.ObjectId; 
  hobbies: string[];
  status: "Active" | "Inactive";
  isDeleted: boolean;
}

const UserSchema = new Schema<User>(
  {
    userName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      select: false
    },
    roleId: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: true
    },
    hobbies: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active"
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export const UserModel = model<User>("User", UserSchema);