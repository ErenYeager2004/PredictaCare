import jwt from 'jsonwebtoken';

const authDoctor = async (req, res, next) => {
    try {
        const { dtoken } = req.headers;
        if (!dtoken) {
            return res.status(401).json({ success: false, message: 'Not Authorized. Login Again.' });
        }

        const token_decode = jwt.verify(dtoken, process.env.JWT_SECRET);
        req.docId = token_decode.id;

        next();
    } catch (error) {
        console.error('Authentication Error:', error);
        res.status(401).json({ success: false, message: 'Invalid or Expired Token. Login Again.' });
    }
};

export default authDoctor;
