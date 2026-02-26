import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import pool from './pool.script';

export async function initDb(): Promise<void> {
    try {
        const sqlPath = path.join(__dirname, 'init.script.sql');
        const sql = fs.readFileSync(sqlPath, 'utf-8');
        await pool.query(sql);

        // Ensure verification_code is VARCHAR
        await pool.query(`
            DO $$ 
            BEGIN 
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'certificates' 
                    AND column_name = 'verification_code' 
                    AND data_type = 'uuid'
                ) THEN
                    ALTER TABLE certificates ALTER COLUMN verification_code TYPE VARCHAR(50);
                END IF;
            END $$;
        `);

        // Add canvas_width and canvas_height to templates
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'templates' 
                    AND column_name = 'canvas_width'
                ) THEN
                    ALTER TABLE templates ADD COLUMN canvas_width INT DEFAULT 0;
                    ALTER TABLE templates ADD COLUMN canvas_height INT DEFAULT 0;
                END IF;
            END $$;
        `);

        // Alter position columns to REAL
        await pool.query(`
            DO $$ 
            BEGIN 
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'template_fields' 
                    AND column_name = 'position_x' 
                    AND data_type = 'integer'
                ) THEN
                    ALTER TABLE template_fields ALTER COLUMN position_x TYPE REAL;
                    ALTER TABLE template_fields ALTER COLUMN position_y TYPE REAL;
                END IF;
            END $$;
        `);

        // Add preview ID columns to templates
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'templates' 
                    AND column_name = 'preview_certificate_id'
                ) THEN
                    ALTER TABLE templates ADD COLUMN preview_certificate_id VARCHAR(20);
                    ALTER TABLE templates ADD COLUMN preview_verification_code VARCHAR(50);
                END IF;
            END $$;
        `);

        // Add default_value column to template_fields
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'template_fields' 
                    AND column_name = 'default_value'
                ) THEN
                    ALTER TABLE template_fields ADD COLUMN default_value TEXT;
                END IF;
            END $$;
        `);

        // Add is_static column to template_fields
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'template_fields' 
                    AND column_name = 'is_static'
                ) THEN
                    ALTER TABLE template_fields ADD COLUMN is_static BOOLEAN DEFAULT FALSE;
                END IF;
            END $$;
        `);

        // Add custom_data column to certificates
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'certificates' 
                    AND column_name = 'custom_data'
                ) THEN
                    ALTER TABLE certificates ADD COLUMN custom_data JSONB DEFAULT '{}';
                END IF;
            END $$;
        `);

        // Make completion_date nullable (not all templates have a date field)
        await pool.query(`
            ALTER TABLE certificates ALTER COLUMN completion_date DROP NOT NULL;
        `);

        // Make student_name and course_name nullable (templates may not have these)
        await pool.query(`
            ALTER TABLE certificates ALTER COLUMN student_name DROP NOT NULL;
            ALTER TABLE certificates ALTER COLUMN course_name DROP NOT NULL;
        `);

        // Change certificates.template_id FK to ON DELETE SET NULL
        // so certificates persist when their template is deleted
        await pool.query(`
            DO $$
            DECLARE
                fk_name TEXT;
            BEGIN
                SELECT tc.constraint_name INTO fk_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_name = 'certificates'
                  AND tc.constraint_type = 'FOREIGN KEY'
                  AND kcu.column_name = 'template_id';

                IF fk_name IS NOT NULL THEN
                    EXECUTE 'ALTER TABLE certificates DROP CONSTRAINT ' || fk_name;
                    ALTER TABLE certificates
                        ADD CONSTRAINT certificates_template_id_fkey
                        FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL;
                END IF;

                ALTER TABLE certificates ALTER COLUMN template_id DROP NOT NULL;
            END $$;
        `);

        console.log('Database tables initialized and verified');

        // Seed admin user
        const adminCheck = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            ['admin@sarvarth.com']
        );

        if (adminCheck.rows.length === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await pool.query(
                `INSERT INTO users (name, email, password_hash, role) 
         VALUES ($1, $2, $3, $4)`,
                ['Admin', 'admin@sarvarth.com', hashedPassword, 'admin']
            );
            console.log('Admin user seeded (admin@sarvarth.com / admin123)');
        }

        // Ensure upload and generated directories exist
        const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
        const generatedDir = path.join(__dirname, '..', '..', 'generated');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir, { recursive: true });

    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
}
