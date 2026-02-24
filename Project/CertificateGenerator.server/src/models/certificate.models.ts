/**
 * certificate.models.ts — Certificate Type Definitions
 *
 * Certificates are the core output of this application. Each certificate
 * ties a student's name to a course, a completion date, and a unique
 * verification code that anyone can use to confirm it's legit.
 */

// A certificate record as stored in the database
export interface Certificate {
    id: string;                      // UUID — uniquely identifies this certificate
    user_id: string;                 // The admin/user who generated this certificate
    student_name: string;            // Name printed on the certificate
    course_name: string;             // Course or program title
    template_id: string;             // Which template design was used
    completion_date: string;         // When the student completed the course
    pdf_path: string | null;         // File path to the generated PDF (null if not yet generated)
    verification_code: string;       // Short code for the public verification URL
    created_at: Date;
    status: 'active' | 'disabled';   // Disabled certificates won't pass verification
}

// Used when uploading a CSV for bulk certificate generation
export interface BulkStudentData {
    student_name: string;
    course_name: string;
    completion_date: string;
}

/*
 * Everything the PDF generator needs to create a certificate.
 * This bundles together the certificate data, the template image,
 * and all the positioned fields with their styling.
 */
export interface CertificateData {
    certificate: {
        id: string;
        student_name: string;
        course_name: string;
        completion_date: string;
        verification_code: string;
    };
    template: {
        template_image_path: string;
        canvas_width?: number;       // Display width when fields were positioned in the designer
        canvas_height?: number;      // Display height — used to scale positions to actual image size
    };
    fields: Array<{
        field_type: string;          // e.g. "student_name", "course_name", or "custom_text_*"
        label?: string;
        position_x: number;          // X position in pixels (relative to canvas)
        position_y: number;          // Y position in pixels (relative to canvas)
        font_size: number;
        font_color: string;          // Hex color like "#000000"
        font_family: string;         // Font name like "Helvetica" or "Parisienne"
        is_bold: boolean;
        is_italic: boolean;
        text_align: string;          // "left", "center", or "right"
        default_value?: string;      // Default/preview value for custom fields
    }>;
}
