import axios from 'axios';

async function checkData() {
  try {
    const res = await axios.get('http://localhost:3000/api/sheets/Operators');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error(e.message);
  }
}

checkData();
