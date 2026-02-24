/**
 * auth.models.ts — Authentication Type Definitions
 *

 */

// Represents a user record exactly as it exists in the database
export interface User {
    id: string;
    name: string;
    email: string;
    password_hash: string;          // bcrypt-hashed password — never exposed to clients
    role: 'admin' | 'user';         // Admins can manage templates & view all certificates
    created_at?: Date;
}

// What we send back to the client after a successful login or registration
export interface AuthResponse {
    token: string;                   // JWT access token for authenticating future requests
    user: {
        id: string;
        name: string;
        email: string;
        role: 'admin' | 'user';
    };
}
