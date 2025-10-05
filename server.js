import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { MongoClient, ServerApiVersion } from 'mongodb';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt'; // Use bcrypt for robust password hashing
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Cloudinary Configuration ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- MongoDB Connection ---
const mongoClient = new MongoClient(process.env.MONGO_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
});
let carsCollection;
let credentialsCollection;

app.use(cors());
app.use(cookieParser());
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// Serve the frontend static files (HTML, CSS, JS) from the project root
app.use(express.static(__dirname));

// Middleware to verify JWT for protected routes
const verifyToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Invalid token.' });
        req.user = decoded; // Add user payload to request
        next();
    });
};

// Multer configuration: Use memory storage to process images with sharp before saving
const upload = multer({ storage: multer.memoryStorage() });

// Helper function to delete image files from the server
const deleteImages = async (imageUrls) => {
    if (!imageUrls || imageUrls.length === 0) return;
    for (const url of imageUrls) {
      try {
        // Extract public_id from Cloudinary URL
        const publicId = path.parse(new URL(url).pathname).name;
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        console.error(`Failed to delete image from Cloudinary: ${url}`, error);
      }
    }
};
// Get all cars
app.get('/api/cars', async (req, res) => {
  const cars = await carsCollection.find({}).sort({ _id: -1 }).toArray();
  res.json(cars);
});

// --- Admin Credential Routes ---

// Check if an admin account exists
app.get('/api/admin/exists', async (req, res) => {
    const creds = await credentialsCollection.findOne({});
    res.json({ exists: !!creds.username });
});

// Setup the first admin account
app.post('/api/admin/setup', async (req, res) => {
    const { username, password } = req.body;
    const creds = await credentialsCollection.findOne({});
    if (creds.username) {
        return res.status(403).json({ error: 'Admin account already exists.' });
    }
    const saltRounds = 10; // The cost factor for hashing
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    await credentialsCollection.insertOne({ username, password: hashedPassword });
    res.status(201).json({ message: 'Admin account created successfully.' });
});

// Admin login
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    const creds = await credentialsCollection.findOne({ username: username });

    if (!creds.username || !creds.password) {
        return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    const passwordMatch = await bcrypt.compare(password, creds.password);

    if (creds.username === username && passwordMatch) {
        // Create and sign a JWT
        const token = jwt.sign({ username: creds.username }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.cookie('token', token, {
            httpOnly: true, // The cookie is not accessible via client-side script
            secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
            sameSite: 'strict', // Mitigates CSRF attacks
            maxAge: 3600000 // 1 hour
        });

        res.json({ success: true, message: 'Login successful.' });
    } else {
        res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }
});

// Update admin credentials
app.post('/api/admin/update-credentials', verifyToken, async (req, res) => {
    const { username, currentPassword, newPassword } = req.body;
    const creds = await credentialsCollection.findOne({});

    // Verify current password
    if (!creds.username || !creds.password) {
        return res.status(401).json({ error: 'Invalid current password.' });
    }
    const passwordMatch = await bcrypt.compare(currentPassword, creds.password);
    if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid current password.' });
    }

    // Update credentials
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    await credentialsCollection.updateOne({ _id: creds._id }, { $set: {
        username: username,
        password: hashedNewPassword
}});

    res.json({ message: 'Credentials updated successfully.' });
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logout successful.' });
});

// --- End Admin Credential Routes ---

// --- Contact Form Route ---
app.post('/api/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;

    // Basic server-side validation
    if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: 'All fields are required.' });
    }


    // Create a transporter object using your email service's SMTP settings
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // Use SSL
        auth: {
            user: process.env.EMAIL_USER, // Loaded from .env file
            pass: process.env.EMAIL_PASS, // Loaded from .env file
        },
    });

    // Set up email data for the site owner
    const mailOptionsToOwner = {
        from: `"${name}" <${email}>`, // Sender address (shows user's name and email)
        replyTo: `"${name}" <${email}>`, // Ensure replies go to the user who filled the form
        to: process.env.EMAIL_USER, // List of receivers (sends to your email)
        subject: `Contact Form: ${subject}`, // Subject line
        text: message, // Plain text body
        html: `<p>You have a new contact request from:</p>
               <ul>
                 <li><b>Name:</b> ${name}</li>
                 <li><b>Email:</b> ${email}</li>
               </ul>
               <h3>Message:</h3>
               <p>${message}</p>`, // HTML body
    };

    try {
        // Send email to the site owner
        await transporter.sendMail(mailOptionsToOwner);

        // Set up and send confirmation email to the user
        const mailOptionsToUser = {
            from: process.env.EMAIL_USER, // Site's email
            to: email, // User's email
            subject: `Confirmation: Your message to Blissful Car`,
            text: `Dear ${name},\n\nThank you for contacting Blissful Car. We have received your message and will get back to you shortly.\n\nHere is a copy of your message:\n\nSubject: ${subject}\nMessage: ${message}\n\nBest regards,\nThe Blissful Car Team`,
            html: `<p>Dear ${name},</p>
                   <p>Thank you for contacting Blissful Car. We have received your message and will get back to you shortly.</p>
                   <h3>Here is a copy of your message:</h3>
                   <p><b>Subject:</b> ${subject}</p>
                   <p><b>Message:</b> ${message}</p>
                   <p>Best regards,<br>The Blissful Car Team</p>`,
        };
        try {
            await transporter.sendMail(mailOptionsToUser);
        } catch (confirmationError) {
            console.error('Error sending confirmation email to user:', confirmationError);
            // Do not block success response if confirmation email fails
        }
        res.status(200).json({ message: 'Thank you for your message! We will get back to you soon.' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ message: 'Sorry, there was an error sending your message. Please try again later.' });
    }
});


// Add a new car
app.post('/api/cars', verifyToken, upload.array('images', 10), async (req, res) => { // Make this async
    const { model, year, seating, transmission, description, featured } = req.body;

    // Basic validation
    if (!model || !year || !seating || !transmission || !description || !req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'Missing required car data or images.' });
    }

    // req.files contains the array of uploaded image files
    // req.body contains the text fields

    // Features are sent as a comma-separated string
    const features = req.body.features ? req.body.features.split(',').map(f => f.trim()) : [];
    const imageUrls = [];

    // Find the highest existing ID and add 1
    const lastCar = await carsCollection.find().sort({id: -1}).limit(1).toArray();
    const newId = lastCar.length > 0 ? lastCar[0].id + 1 : 1;


    // Process each uploaded image
    for (const file of req.files) {
        try {
            // Upload to Cloudinary directly from buffer
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { resource_type: 'image', folder: 'blissful_car' },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );
                uploadStream.end(file.buffer);
            });
            imageUrls.push(result.secure_url);
        } catch (error) {
            console.error('Error uploading image to Cloudinary:', error);
            // Optionally, handle error more gracefully, e.g., return an error response
        }
    }

    const newCar = {
        id: newId,
        model,
        year: parseInt(year, 10),
        seating: parseInt(seating, 10),
        transmission,
        description,
        features,
        images: imageUrls, // Store the array of image URLs
        featured: featured === 'true', // Convert string from FormData to boolean
    };

    const result = await carsCollection.insertOne(newCar);
    res.status(201).json({ ...newCar, _id: result.insertedId });
});

// Update a car
app.put('/api/cars/:id', verifyToken, upload.array('images', 10), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const carToUpdate = await carsCollection.findOne({ id: id });
  if (!carToUpdate) return res.status(404).json({ error: 'Car not found' });

  const { model, year, seating, transmission, description, featured } = req.body;

  if (!model || !year || !seating || !transmission || !description) {
    return res.status(400).json({ error: 'Missing required car data.' });
  }

  const features = req.body.features ? req.body.features.split(',').map(f => f.trim()) : [];
  
  const updatedCar = {
      ...carToUpdate,
      model,
      year: parseInt(year, 10),
      seating: parseInt(seating, 10),
      transmission,
      description,
      features,
      featured: featured === 'true',
  };

  // If new images are uploaded, process them and replace the old ones
  if (req.files && req.files.length > 0) {
      // Delete old images before adding new ones
      await deleteImages(updatedCar.images);

      const imageUrls = [];
      for (const file of req.files) {
          try {
              const result = await new Promise((resolve, reject) => {
                  const uploadStream = cloudinary.uploader.upload_stream({ resource_type: 'image', folder: 'blissful_car' }, (error, result) => {
                      if (error) return reject(error);
                      resolve(result);
                  });
                  uploadStream.end(file.buffer);
              });
              imageUrls.push(result.secure_url);
          } catch (error) {
              console.error('Error uploading image to Cloudinary during update:', error);
          }
      }
      updatedCar.images = imageUrls;
  }

  // We don't want to update the MongoDB internal _id
  delete updatedCar._id;

  await carsCollection.updateOne({ id: id }, { $set: updatedCar });
  res.json(updatedCar);
});

// Delete a car
app.delete('/api/cars/:id', verifyToken, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const carToDelete = await carsCollection.findOne({ id: id });
  if (!carToDelete) return res.status(404).json({ error: 'Car not found' });
  
  // Delete associated images first
  await deleteImages(carToDelete.images);

  const result = await carsCollection.deleteOne({ id: id });
  if (result.deletedCount === 1) {
    res.json(carToDelete);
  } else {
    res.status(500).json({ error: 'Failed to delete car' });
  }
});

const startServer = async () => {
  try {
    await mongoClient.connect();
    const db = mongoClient.db();
    carsCollection = db.collection('cars');
    credentialsCollection = db.collection('credentials');
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
