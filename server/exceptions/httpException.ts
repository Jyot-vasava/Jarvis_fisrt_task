export class HttpException extends Error {
  public status: boolean;
  public statusCode: number;
  public message: string;
  public data: any;
  public errorMsg: string;

  constructor(
    status: boolean,
    statusCode: number,
    message: string,
    data: any,
    error: string,
  ) {
    super(message);

    this.status = status;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.errorMsg = error;
  }
}
