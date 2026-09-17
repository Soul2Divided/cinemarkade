import { Injectable } from '@angular/core';

import type { CrearUserCommand, User } from './user.model';

@Injectable()
export abstract class UserRepository {
    abstract createUser(command: CrearUserCommand): Promise<User>;
    abstract findByEmail(mail: string): Promise<User | null>;
    abstract signIn(mail: string, password: string): Promise<User>;
}