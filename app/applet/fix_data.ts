import axios from 'axios';

async function fixData() {
  try {
    const res = await axios.get('http://localhost:3000/api/sheets/Operators');
    const data = res.data;
    if (data.length > 0) {
      const firstEmp = data[0];
      // Update the first employee with some dummy role data to trigger column creation
      await axios.put(`http://localhost:3000/api/sheets/Operators/${firstEmp.id}`, {
        data: {
          ...firstEmp,
          role: firstEmp.role || 'Cutting',
          skill: firstEmp.skill || 'B',
          wage: firstEmp.wage || 0,
          joinDate: firstEmp.joinDate || new Date().toISOString().split('T')[0],
          status: firstEmp.status || 'Active'
        }
      });
      console.log('Successfully updated first employee and triggered column creation');
    } else {
      console.log('No employees found');
    }
  } catch (e) {
    console.error(e.message);
  }
}

fixData();
