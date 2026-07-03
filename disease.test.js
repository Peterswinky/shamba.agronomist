const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z
    .string()
    .regex(/^(?:\+254|0)[17]\d{8}$/, 'Enter a valid Kenyan phone number, e.g. 0712345678'),
  email: z.string().email().optional().nullable(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['FARMER', 'BUYER']),
  location: z.string().optional(),
  county: z.string().optional(),
});

const loginSchema = z.object({
  phone: z.string().min(6),
  password: z.string().min(1),
});

const soilCheckSchema = z.object({
  soilType: z.string(),
  acreage: z.number().positive().max(10000),
});

const listingSchema = z.object({
  cropName: z.string().min(2).max(100),
  quantityKg: z.number().positive(),
  pricePerKg: z.number().positive(),
  location: z.string().min(2),
  county: z.string().min(2),
  contactPhone: z.string().regex(/^(?:\+254|0)[17]\d{8}$/),
});

const inquirySchema = z.object({
  message: z.string().max(500).optional(),
});

const boostPaymentSchema = z.object({
  phone: z
    .string()
    .regex(/^(?:\+254|0)[17]\d{8}$/, 'Enter a valid Kenyan phone number, e.g. 0712345678')
    .optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  soilCheckSchema,
  listingSchema,
  inquirySchema,
  boostPaymentSchema,
};
