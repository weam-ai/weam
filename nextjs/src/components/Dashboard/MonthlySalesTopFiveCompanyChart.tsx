import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import Select from 'react-select';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

export const CompanyOptions = [
    { value: 'all', label: 'All' },
    { value: 'UnlimitedWP', label: 'UnlimitedWP' },
    { value: 'Bluedart Inc.', label: 'Bluedart Inc.' },
    { value: 'BrightHorizon Solutions', label: 'BrightHorizon Solutions' },
    { value: 'Skyline Technologies', label: 'Skyline Technologies' },
    { value: 'Nexus Systems', label: 'Nexus Systems' },
];

const companyData = {
    'UnlimitedWP': [100, 120, 150, 80, 130, 250, 90, 60, 140, 180, 160, 70],
    'Bluedart Inc.': [90, 110, 140, 70, 120, 240, 80, 50, 130, 170, 150, 60],
    'BrightHorizon Solutions': [
        80, 100, 130, 60, 110, 230, 70, 40, 120, 160, 140, 50,
    ],
    'Skyline Technologies': [
        70, 90, 120, 50, 100, 220, 60, 30, 110, 150, 130, 40,
    ],
    'Nexus Systems': [60, 80, 110, 40, 90, 210, 50, 20, 100, 140, 120, 30],
};

const generateChartData = (selectedCompany) => {
    const labels = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    let datasets;

    if (selectedCompany === 'all') {
        datasets = Object.keys(companyData).map((company, index) => ({
            label: company,
            data: companyData[company],
            borderColor: ['#40BD7E', '#7818E2', '#7818E2', '#EC6243', '#FCBC6F'][index],
            backgroundColor: 'rgba(0, 0, 0, 0)',
            fill: false,
            tension: 0.4,
            borderWidth: 1,
        }));
    } else {
        datasets = [
            {
                label: selectedCompany,
                data: companyData[selectedCompany],
                borderColor: '#40BD7E',
                backgroundColor: 'rgba(0, 0, 0, 0)',
                fill: false,
                tension: 0.4,
                borderWidth: 1,
            },
        ];
    }

    return {
        labels,
        datasets,
    };
};

const MonthlySalesTopFiveCompanyChart = () => {
    const [selectedCompany, setSelectedCompany] = useState('all');
    const [chartData, setChartData] = useState(generateChartData('all'));
    const [totalSales, setTotalSales] = useState(0);

    useEffect(() => {
        const data = generateChartData(selectedCompany);
        setChartData(data);

        const total = data.datasets.reduce(
            (sum, dataset) => sum + dataset.data.reduce((a, b) => a + b, 0),
            0
        );
        setTotalSales(total);
    }, [selectedCompany]);

    return (
        <div className="border border-b11 rounded-10 p-5 flex flex-col h-full w-full">
            <div className="flex items-start justify-between mb-8">
                <div className="me-3">
                    <h5 className="text-font-18 font-semibold text-b2 mb-2">
                        Monthly Sales Revenue by Top 5 Companies
                    </h5>
                    <h4 className="text-font-24 font-semibold text-b2">
                        ${totalSales.toFixed(2)}
                    </h4>
                </div>
                <Select
                    options={CompanyOptions}
                    menuPlacement="auto"
                    className="react-select-container b-white w-[200px] mb-4"
                    classNamePrefix="react-select"
                    defaultValue={CompanyOptions[0]}
                    onChange={(option) => setSelectedCompany(option.value)}
                />
            </div>
            <div className="monthly-sales-company-chart flex-grow">
                <Line
                    data={chartData}
                    options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false,
                            },
                        },
                        scales: {
                            x: {
                                display: true,
                                title: {
                                    display: false,
                                },
                            },
                            y: {
                                display: true,
                                title: {
                                    display: false,
                                },
                                beginAtZero: true,
                            },
                        },
                    }}
                />
            </div>
            <div className="custom-legend flex items-center mt-4 gap-3 flex-wrap">
                {chartData.datasets.map((dataset, index) => (
                    <div
                        key={index}
                        className="custom-legend-item flex items-center"
                    >
                        <span
                            className="legend-color-box block size-2.5 rounded-full"
                            style={{ backgroundColor: dataset.borderColor }}
                        ></span>
                        <span className="legend-label ms-2.5 text-font-14 text-b5">
                            {dataset.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MonthlySalesTopFiveCompanyChart;
