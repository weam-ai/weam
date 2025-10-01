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

const YearOptions = [
  { value: '2010', label: '2010' },
  { value: '2011', label: '2011' },
  { value: '2012', label: '2012' },
  { value: '2013', label: '2013' },
  { value: '2014', label: '2014' },
  { value: '2015', label: '2015' },
  { value: '2016', label: '2016' },
  { value: '2017', label: '2017' },
  { value: '2018', label: '2018' },
  { value: '2019', label: '2019' },
  { value: '2020', label: '2020' },
];

const salesData = {
  'Bluedart Pvt. Ltd.': {
    '2010': [150, 200, 175, 584, 856, 45, 354],
    '2011': [250, 55, 69, 584, 856, 45, 354],
    '2012': [88, 88, 21, 156, 584, 856, 45, 354],
    '2013': [10, 584, 856, 45, 125, 525, 354],
    '2014': [105, 156, 584, 856, 45, 663, 951],
    '2015': [10, 56, 84, 88, 88, 21, 88, 88, 21],
    '2016': [452, 156, 525, 125, 525, 354, 125],
    '2017': [10, 56, 84],
    '2018': [452, 156, 584, 856, 45, 951],
    '2019': [10, 56, 84, 584, 856, 45, 663],
    '2020': [10, 56, 84, 156, 525, 125, 525],
  },
  'Summit Ventures': {
    '2010': [100, 150, 125],
    '2011': [200, 140, 190],
    '2012': [160, 230, 180],
    '2013': [230, 200, 270],
  },
  'Quantum Innovations': {
    '2010': [200, 250, 225],
    '2011': [300, 200, 140],
    '2012': [190, 160, 170],
    '2013': [220, 190, 260],
  },
  'Stellar Industries': {
    '2010': [130, 180, 150],
    '2011': [210, 250, 55],
    '2012': [69, 88, 88],
    '2013': [21, 58, 130],
  },
  'BlueSky Technologies': {
    '2010': [170, 220, 190],
    '2011': [260, 230, 250],
    '2012': [100, 60, 75],
    '2013': [180, 210, 90],
  },
  'AlphaForge Enterprises': {
    '2010': [140, 190, 160],
    '2011': [230, 200, 140],
    '2012': [190, 160, 170],
    '2013': [220, 120, 240],
  },
  'Zenith Solutions': {
    '2010': [180, 230, 200],
    '2011': [270, 260, 230],
    '2012': [250, 100, 60],
    '2013': [75, 180, 40],
  },
};

const generateChartData = (company, year) => {
  const data = salesData[company]?.[year] || [];
  return {
    labels: ['Jan', 'Feb', 'Mar'],
    datasets: [
      {
        label: `${company} - ${year}`,
        data: data,
        backgroundColor: '#5065F6',
        borderColor: '#5065F6',
        borderWidth: 1,
        borderRadius: { topLeft: 10, topRight: 10 },
        barThickness: 10,
        maxBarThickness: 10,
        barPercentage: 0.5,
      },
    ],
  };
};

const RevenueReportCompanyChart = () => {
  const [selectedCompany, setSelectedCompany] = useState(CompanyOptions[0].value);
  const [selectedYear, setSelectedYear] = useState(YearOptions[0].value);
  const [chartData, setChartData] = useState(generateChartData(CompanyOptions[0].value, YearOptions[0].value));
  const [totalSales, setTotalSales] = useState(salesData[CompanyOptions[0].value][YearOptions[0].value].reduce((acc, value) => acc + value, 0));

  useEffect(() => {
    const data = generateChartData(selectedCompany, selectedYear);
    setChartData(data);
    const total = salesData[selectedCompany]?.[selectedYear]?.reduce((acc, value) => acc + value, 0) || 0;
    setTotalSales(total);
  }, [selectedCompany, selectedYear]);

  const handleCompanyChange = (selectedOption) => {
    setSelectedCompany(selectedOption.value);
  };

  const handleYearChange = (selectedOption) => {
    setSelectedYear(selectedOption.value);
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
          <h5 className='text-font-18 font-semibold text-b2 mb-2'>Revenue Report by Company</h5>
          <h4 className='text-font-24 font-semibold text-b2'>${totalSales.toFixed(2)}</h4>
        </div>
        <div className='flex space-x-2'>
          <Select
            options={CompanyOptions}
            menuPlacement="auto"
            className="react-select-container b-white min-w-[240px]"
            classNamePrefix="react-select"
            defaultValue={CompanyOptions[0]}
            onChange={handleCompanyChange}
          />
          <Select
            options={YearOptions}
            menuPlacement="auto"
            className="react-select-container b-white min-w-[110px]"
            classNamePrefix="react-select"
            defaultValue={YearOptions[0]}
            onChange={handleYearChange}
          />
        </div>
      </div>
      <div className='h-[310px]'>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

export default RevenueReportCompanyChart;
