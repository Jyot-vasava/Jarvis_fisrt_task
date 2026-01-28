import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { UserModel } from "./Model/user.Model.js";
import { RoleModel } from "./Model/role.Model.js";
import { ModuleModel } from "./Model/module.Model.js";
import Settings from "./Model/settings.Model.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/test";

    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");

    /* --------------------------------
       1. CREATE MODULES (Fixed naming)
    -------------------------------- */
    const moduleActions = [
      { moduleName: "Users", action: "create" },
      { moduleName: "Users", action: "list" },
      { moduleName: "Users", action: "export" },
      { moduleName: "Users", action: "upload" },  // NEW: Upload permission
      { moduleName: "Users", action: "edit_self"},
      { moduleName: "Users", action: "edit_any" },
      { moduleName: "Users", action: "delete" },
      { moduleName: "Roles", action: "create" },
      { moduleName: "Roles", action: "list" },
      { moduleName: "Roles", action: "edit" },
      { moduleName: "Roles", action: "delete" }
    ];

    const moduleIds: mongoose.Types.ObjectId[] = [];

    for (const mod of moduleActions) {
      let module = await ModuleModel.findOne({
        moduleName: mod.moduleName,
        action: mod.action,
        isDeleted: { $ne: true }
      });

      if (!module) {
        module = await ModuleModel.create({
          ...mod,
          isDeleted: false
        });
        console.log(`✅ Created module: ${mod.moduleName} - ${mod.action}`);
      } 
      moduleIds.push(module._id as mongoose.Types.ObjectId);
    }

    console.log(`✅ All ${moduleIds.length} modules seeded`);

    /* --------------------------------
       2. CREATE / UPDATE SETTINGS
    -------------------------------- */
    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create({
        allowFileTypes: ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png", "gif"],
        maxFileSize: 10  // 10 MB
      });
      console.log("✅ Settings created");
      console.log(`   Allowed file types: ${settings.allowFileTypes.join(", ")}`);
      console.log(`   Max file size: ${settings.maxFileSize} MB`);
    } else {
      console.log("ℹ️ Settings already exist");
      console.log(`   Allowed file types: ${settings.allowFileTypes.join(", ")}`);
      console.log(`   Max file size: ${settings.maxFileSize} MB`);
    }

    /* --------------------------------
       3. CREATE / UPDATE ADMIN ROLE
    -------------------------------- */
    let adminRole = await RoleModel.findOne({
      roleName: "Admin",
      isDeleted: false
    });

    if (!adminRole) {
      adminRole = await RoleModel.create({
        roleName: "Admin",
        status: "Active",
        permissions: moduleIds,
        isDeleted: false
      });
      console.log("✅ Admin role created with all permissions");
    } else {
      adminRole.permissions = moduleIds;
      adminRole.status = "Active";
      await adminRole.save();
      console.log("✅ Admin role updated with all permissions");
    }

    /* --------------------------------
       4. CREATE ADMIN USER
    -------------------------------- */
    const existingAdmin = await UserModel.findOne({
      email: "admin@gmail.com",
      isDeleted: false
    });

    if (existingAdmin) {
      console.log("ℹ️ Admin user already exists");
      console.log("📧 Email: admin@gmail.com");
      console.log("🔑 Password: Admin@123");
    } else {
      const hashedPassword = await bcrypt.hash("Admin@123", 10);

      await UserModel.create({
        userName: "Admin",
        email: "admin@gmail.com",
        password: hashedPassword,
        roleId: adminRole._id,
        hobbies: [],
        status: "Active",
        isDeleted: false
      });

      console.log("✅ Admin user created successfully");
      console.log("📧 Email: admin@gmail.com");
      console.log("🔑 Password: Admin@123");
    }

    console.log("\n✅ Seeding completed successfully!");
    console.log(`📊 Total modules: ${moduleIds.length}`);
    console.log(`📊 Admin role ID: ${adminRole._id}`);
    console.log(`📊 Upload settings configured`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding admin:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    process.exit(1);
  }
};

seedAdmin();