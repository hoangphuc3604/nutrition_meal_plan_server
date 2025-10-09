const enum SuccessCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
}

export class SuccessResponse {
  private message: string;
  private statusCode: SuccessCode;
  private data: any;

  constructor({
    message = "Success",
    statusCode = SuccessCode.OK,
    data = null
  }: {
    message?: string;
    statusCode?: SuccessCode;
    data?: any;
  } = {}) {
    this.message = message;
    this.statusCode = statusCode;
    this.data = data;
  }

  public send(res: any): void {
    const responseBody: any = { 
      status: 'success',
      message: this.message 
    };
    if (this.data !== null) {
      responseBody.data = this.data;
    }
    res.status(this.statusCode).json(responseBody);
  }
}

export class CreatedResponse extends SuccessResponse {
  constructor(data: any = null, message: string = "Created") {
    super({ message, statusCode: SuccessCode.CREATED, data });
  }
}

export class OkResponse extends SuccessResponse {
  constructor(data: any = null, message: string = "Success") {
    super({ message, statusCode: SuccessCode.OK, data });
  }
}
