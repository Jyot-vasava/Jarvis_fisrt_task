import { Parser } from "json2csv";
import { Response } from "express";

export const exportToCSV = <T>(
  res: Response,
  data: T[],
  fileName = "export.csv"
) => {
  try {
    const parser = new Parser();
    const csv = parser.parse(data);

    res.header("Content-Type", "text/csv");
    res.attachment(fileName);
    return res.send(csv);
  } catch (error) {
    console.error("CSV export error:", error);
    res.status(500).json({ message: "Failed to export CSV" });
  }
};
