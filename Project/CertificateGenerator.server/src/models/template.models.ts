export interface Template {
    id: string;
    user_id: string;
    name: string;
    template_image_path: string;
    created_at?: Date;
    canvas_width?: number;
    canvas_height?: number;
    preview_certificate_id?: string;
    preview_verification_code?: string;
}

export interface TemplateField {
    id?: string;
    template_id: string;
    field_type: string;
    label: string;
    position_x: number;
    position_y: number;
    font_size: number;
    font_color: string;
    font_family: string;
    is_bold: boolean;
    is_italic: boolean;
    text_align: string;
    default_value?: string;
}
