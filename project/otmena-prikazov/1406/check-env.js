console.log('=== Environment Check ===');
console.log('TBANK_TERMINAL_KEY:', process.env.TBANK_TERMINAL_KEY || 'NOT SET');
console.log('TBANK_SECRET_KEY:', process.env.TBANK_SECRET_KEY ? 'SET' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
