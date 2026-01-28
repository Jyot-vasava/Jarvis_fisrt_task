import { Schema, model, Types } from "mongoose";

export interface Role {
  roleName: string;
  status: "Active" | "Inactive";
  permissions: Types.ObjectId[]; 
  isDeleted: boolean;
}

const RoleSchema = new Schema<Role>(
  {
    roleName: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active"
    },
    permissions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Module"
      }
    ],
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export const RoleModel = model<Role>("Role", RoleSchema);