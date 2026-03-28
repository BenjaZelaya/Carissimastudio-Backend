import mongoose from "mongoose";

const UsuarioSchema = new mongoose.Schema(
    {
        nombre: {
            type: String,
            required: [true, "El nombre es obligatorio"],
            trim: true,
            minlength: [3, "El nombre debe tener al menos 3 caracteres"],
            maxlength: [40, "El nombre no puede superar los 40 caracteres"],
            match: [
                /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
                "El nombre solo puede contener letras y espacios"],
        },

        apellido: {
            type: String,
            required: [true, "El apellido es obligatorio"],
            trim: true,
            minlength: [3, "El apellido debe tener al menos 3 caracteres"],
            maxlength: [50, "El apellido no puede superar los 50 caracteres"],
        },

        email: {
            type: String,
            required: [true, "El correo es obligatorio"],
            unique: true,
            match: [/^\S+@\S+\.\S+$/, "Debe ser un correo válido"],
            maxlength: [35, "El correo no puede tener más de 35 caracteres"],
        },

        password: {
            type: String,
            required: [true, "La contraseña es obligatoria"],
            minlength: [6, "La contraseña debe tener al menos 6 caracteres"],
            maxlength: [50, "La contraseña no puede superar los 50 caracteres"],
        },

        telefono: {
            type: String,
            required: [true, "El teléfono es obligatorio"],
            match: [
                /^[0-9]{7,15}$/,
                "El teléfono debe contener entre 7 y 15 dígitos numéricos",
            ],
        },

        rol: {
            type: String,
            required: [true, "El rol es obligatorio"],
            enum: ["ADMIN_ROLE", "USER_ROLE"],
            default: "USER_ROLE",
        },

        google: {
            type: Boolean,
            default: false,
        },

        estado: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

UsuarioSchema.methods.toJSON = function () {
    const { password, __v, ...usuario } = this.toObject();
    return usuario;
};

export default mongoose.model("Usuario", UsuarioSchema);