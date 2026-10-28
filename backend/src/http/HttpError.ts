/** Lỗi trả về cho app kèm mã HTTP, vd `throw new HttpError(404, 'Không có node này')`. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
