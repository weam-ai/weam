import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import Select from 'react-select';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const CompanyOptions = [
  { value: 'Bluedart Pvt. Ltd.', label: 'Bluedart Pvt. Ltd.' },
  { value: 'Summit Ventures', label: 'Summit Ventures' },
  { value: 'Quantum Innovations', label: 'Quantum Innovations' },
  { value: 'Stellar Industries', label: 'Stellar Industries' },
  { value: 'BlueSky Technologies', label: 'BlueSky Technologies' },
  { value: 'AlphaForge Enterprises', label: 'AlphaForge Enterprises' },
  { value: 'Zenith Solutions', label: 'Zenith Solutions' },
];

const salesData = {
  'Bluedart Pvt. Ltd.': [150, 200, 175, 250, 55, 69, 88, 88, 21, 10, 56, 84],
  'Summit Ventures': [100, 150, 125, 200, 140, 190, 160, 230, 180, 230, 200, 270],
  'Quantum Innovations': [200, 250, 225, 300, 200, 140, 190, 160, 170, 220, 190, 260],
  'Stellar Industries': [130, 180, 150, 210, 250, 55, 69, 88, 88, 21, 58, 130],
  'BlueSky Technologies': [170, 220, 190, 260, 230, 250, 100, 60, 75, 180, 210, 90],
  'AlphaForge Enterprises': [140, 190, 160, 230, 200, 140, 190, 160, 170, 220, 120, 240],
  'Zenith Solutions': [180, 230, 200, 270, 260, 230, 250, 100, 60, 75, 180, 40],
};

const generateChartData = (company) => {
  return {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: company,
        data: salesData[company],
        backgroundColor: '#40BD7E',
        borderColor: '#40BD7E',
        borderWidth: 1,
        borderRadius: { topLeft: 10, topRight: 10 },
        barThickness: 10,
        maxBarThickness: 10,
        barPercentage: 0.5,
      },
    ],
  };
};

const MonthlySalesCompanyChart = () => {
  const [selectedCompany, setSelectedCompany] = useState(CompanyOptions[0].value);
  const [chartData, setChartData] = useState(generateChartData(CompanyOptions[0].value));
  const [totalSales, setTotalSales] = useState(salesData[CompanyOptions[0].value].reduce((acc, value) => acc + value, 0));

  useEffect(() => {
    const data = generateChartData(selectedCompany);
    setChartData(data);
    const total = salesData[selectedCompany].reduce((acc, value) => acc + value, 0);
    setTotalSales(total);
  }, [selectedCompany]);

  const handleCompanyChange = (selectedOption) => {
    setSelectedCompany(selectedOption.value);
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        borderColor: '#D9D9D9',
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        borderWidth: 0,
        grid: {
          display: true,
          borderWidth: 1,
          borderColor: '#D9D9D9',
        },
      },
    },
  };

  return (
    <div className='bg-b12 rounded-10 p-5 flex flex-col h-full'>
      <div className='flex items-start justify-between mb-8'>
        <div className='me-3'>
          <h5 className='text-font-18 font-semibold text-b2 mb-2'>Monthly Sales Revenue by Company</h5>
          <h4 className='text-font-24 font-semibold text-b2'>${totalSales.toFixed(2)}</h4>
        </div>
        <Select
          options={CompanyOptions}
          menuPlacement="auto"
          className="react-select-container b-white min-w-[240px]"
          classNamePrefix="react-select"
          defaultValue={CompanyOptions[0]}
          onChange={handleCompanyChange}
        />
      </div>
      <div className='h-[310px]'>
          <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

export default MonthlySalesCompanyChart;