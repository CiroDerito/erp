import { AuthUserResponse } from './auth-user.response';

export class LoginResponse {
  accessToken: string;
  tokenType = 'Bearer';
  expiresIn: string;
  user: AuthUserResponse;

  constructor(params: { accessToken: string; expiresIn: string; user: AuthUserResponse }) {
    this.accessToken = params.accessToken;
    this.expiresIn = params.expiresIn;
    this.user = params.user;
  }
}
