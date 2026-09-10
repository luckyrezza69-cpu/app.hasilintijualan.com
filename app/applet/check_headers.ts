import axios from 'axios';

async function checkHeaders() {
  try {
    const res = await axios.get('http://localhost:3000/api/sheets/Operators');
    // The GET endpoint doesn't return headers directly, but we can see the keys of the first object
    if (res.data.length > 0) {
      console.log(Object.keys(res.data[0]));
    }
  } catch (e) {
    console.error(e.message);
  }
}

checkHeaders();
