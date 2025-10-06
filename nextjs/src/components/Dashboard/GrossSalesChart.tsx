import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import Select from 'react-select';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const GrossSalesChartOptions = [
  { value: 'yearly', label: 'Yearly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
];

const dataSets = {
  yearly: {
    labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
    datasets: [
      {
        data: [50, 100, 75, 150, 125, 250, 75, 125, 100, 175, 125, 75],
        backgroundColor: '#5065F6',
        borderColor: '#5065F6',
        borderWidth: 1,
        borderRadius: { topLeft: 10, topRight: 10 },
        barThickness: 30, // Fixed width for each bar
        maxBarThickness: 30,
        barPercentage: 0.5,
      },
    ],
    grossSalesAmount: '$90,239.00'
  },
  monthly: {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        data: [150, 200, 175, 250],
        backgroundColor: '#5065F6',
        borderColor: '#5065F6',
        borderWidth: 1,
        borderRadius: { topLeft: 10, topRight: 10 },
        barThickness: 30, // Fixed width for each bar
        maxBarThickness: 30,
        barPercentage: 0.5,
      },
    ],
    grossSalesAmount: '$45,000.00'
  },
  weekly: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: [30, 50, 40, 60, 70, 45, 35],
        backgroundColor: '#5065F6',
        borderColor: '#5065F6',
        borderWidth: 1,
        borderRadius: { topLeft: 10, topRight: 10 },
        barThickness: 30, // Fixed width for each bar
        maxBarThickness: 30,
        barPercentage: 0.5,
      },
    ],
    grossSalesAmount: '$15,000.00'
  },
};

const GrossSalesChart = () => {
  const [grossSalesAmountOption, setGrossSalesAmountOption] = useState(GrossSalesChartOptions[0]);
  const [chartData, setChartData] = useState(dataSets[grossSalesAmountOption.value]);
  const [delayed, setDelayed] = useState(false);

  useEffect(() => {
    setChartData(dataSets[grossSalesAmountOption.value]);
    setDelayed(false);
  }, [grossSalesAmountOption]);

  const handleGrossSalesChartChange = (selectedOption) => {
    setGrossSalesAmountOption(selectedOption);
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      onComplete: () => {
        setDelayed(true);
      },
      delay: (context) => {
        let delay = 0;
        if (context.type === 'data' && context.mode === 'default' && !delayed) {
          delay = context.dataIndex * 300 + context.datasetIndex * 100;
        }
        return delay;
      },
    },
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
          <h5 className='text-font-18 font-semibold text-b2 mb-2'>Gross Sales Amount</h5>
          <h4 className='text-font-24 font-semibold text-b2'>{chartData.grossSalesAmount}</h4>
        </div>
        <Select
          options={GrossSalesChartOptions}
          menuPlacement="auto"
          className="react-select-container b-white w-[130px]"
          classNamePrefix="react-select"
          defaultValue={GrossSalesChartOptions[0]}
          onChange={handleGrossSalesChartChange}
        />
      </div>
      <div className='gross-sales-amount-graph h-[310px] flex-1'>
          <Bar data={chartData} options={options} />
      </div>
    </div> 
  );
};

export default GrossSalesChart;
