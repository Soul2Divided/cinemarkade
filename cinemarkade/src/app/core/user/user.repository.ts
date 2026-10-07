import { Injectable } from '@angular/core';

import type { CrearUserCommand, CrearUserData, User } from './user.model';

@Injectable()
export abstract class UserRepository {
    abstract createUser(command: CrearUserCommand): Promise<User>;
    abstract createEmployee(command: CrearUserData): Promise<User>;
    abstract findByEmail(mail: string): Promise<User | null>;
    abstract findById(id: string): Promise<User | null>;
    abstract signIn(mail: string, password: string): Promise<User>;
}
