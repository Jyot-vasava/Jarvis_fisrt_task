import { Request, Response } from "express";
import { ModuleModel } from "../Model/module.Model.js";

// Get all modules/permissions
export const getModules = async (req: Request, res: Response): Promise<void> => {
  try {
    const modules = await ModuleModel.find({ isDeleted: false })
      .sort({ moduleName: 1, action: 1 })
      .select('moduleName action');

   console.log(`Fetched ${modules.length} modules`);

    res.status(200).json({ modules });
  } catch (error) {
    console.error("Get modules error:", error);
    res.status(500).json({ message: "Failed to fetch modules" });
  }
};

// Get modules grouped by module name 
export const getModulesGrouped = async (req: Request, res: Response): Promise<void> => {
  try {
    const modules = await ModuleModel.aggregate([
      { $match: { isDeleted: false } },
      { $sort: { moduleName: 1, action: 1 } },
      {
        $group: {
          _id: "$moduleName",
          actions: {
            $push: {
              _id: "$_id",
              action: "$action"
            }
          }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          moduleName: "$_id",
          actions: 1,
          _id: 0
        }
      }
    ]);

    // console.log(`Fetched ${modules.length} module groups`);
    modules.forEach(m => {
      // console.log(`Module: ${m.moduleName}, Actions: ${m.actions.length}`);
    });

    res.status(200).json({ modules });
  } catch (error) {
    console.error("Get modules grouped error:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
    res.status(500).json({ message: "Failed to fetch grouped modules" });
  }
};