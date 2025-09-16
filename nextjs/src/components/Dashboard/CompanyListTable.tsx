import React, { useState } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
} from '@tanstack/react-table';
import Datatable from '@/components/DataTable/DataTable';
import DataTablePagination from '@/components/DataTable/DataTablePagination';
import DataTablePageSizeSelector from '@/components/DataTable/DataTablePageSizeSelector';
import DataTableSearch from '@/components/DataTable/DataTableSearch';
import UpDownArrowIcon from '@/icons/UpDownArrowIcon';
import EditIcon from '@/icons/Edit';


const handleEdit = (rowData) => {
    // Your edit handler logic
};
const data = [
    {
        srNo: '01',
        companyName: 'BrightHorizon Solutions',
        email: 'support@brighthorizonsolutions.com',
        contactNo: '+91 1234567890',
        dateJoined: '04/17/2024',
        renewalDate: '05/17/2024',
        renewalAmount: '20.00',
        noOfUsers: '25',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '02',
        companyName: 'TechNet Corp',
        email: 'info@technetcorp.com',
        contactNo: '+1 9876543210',
        dateJoined: '06/01/2024',
        renewalDate: '07/01/2024',
        renewalAmount: '25.00',
        noOfUsers: '30',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '03',
        companyName: 'GlobeTech Solutions',
        email: 'info@globetechsolutions.com',
        contactNo: '+44 1234567890',
        dateJoined: '03/15/2024',
        renewalDate: '04/15/2024',
        renewalAmount: '18.50',
        noOfUsers: '20',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '04',
        companyName: 'DataSoft Systems',
        email: 'support@datasoftsystems.com',
        contactNo: '+91 9876543210',
        dateJoined: '05/10/2024',
        renewalDate: '06/10/2024',
        renewalAmount: '22.50',
        noOfUsers: '15',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '05',
        companyName: 'InnoTech Solutions',
        email: 'support@innotechsolutions.com',
        contactNo: '+1 2345678901',
        dateJoined: '07/20/2024',
        renewalDate: '08/20/2024',
        renewalAmount: '30.00',
        noOfUsers: '18',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '06',
        companyName: 'GlobalSoft Ltd.',
        email: 'info@globalsftltd.com',
        contactNo: '+44 9876543210',
        dateJoined: '02/28/2024',
        renewalDate: '03/28/2024',
        renewalAmount: '15.00',
        noOfUsers: '12',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '07',
        companyName: 'EagleEye Technologies',
        email: 'info@eagleeyetech.com',
        contactNo: '+1 3456789012',
        dateJoined: '09/05/2024',
        renewalDate: '10/05/2024',
        renewalAmount: '28.00',
        noOfUsers: '22',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '08',
        companyName: 'CyberSafe Solutions',
        email: 'support@cybersafesolutions.com',
        contactNo: '+91 8765432109',
        dateJoined: '01/12/2024',
        renewalDate: '02/12/2024',
        renewalAmount: '19.50',
        noOfUsers: '28',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '09',
        companyName: 'Skyline Innovations',
        email: 'info@skylineinnovations.com',
        contactNo: '+44 5678901234',
        dateJoined: '11/15/2024',
        renewalDate: '12/15/2024',
        renewalAmount: '21.50',
        noOfUsers: '35',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '10',
        companyName: 'DataHub Systems',
        email: 'info@datahubsyst.com',
        contactNo: '+1 6543210987',
        dateJoined: '08/10/2024',
        renewalDate: '09/10/2024',
        renewalAmount: '24.50',
        noOfUsers: '17',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '11',
        companyName: 'TechBridge Solutions',
        email: 'support@techbridgesolutions.com',
        contactNo: '+91 2345678901',
        dateJoined: '05/25/2024',
        renewalDate: '06/25/2024',
        renewalAmount: '27.50',
        noOfUsers: '23',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '12',
        companyName: 'InnovaTech Services',
        email: 'info@innovatechsvc.com',
        contactNo: '+44 8765432109',
        dateJoined: '03/08/2024',
        renewalDate: '04/08/2024',
        renewalAmount: '16.50',
        noOfUsers: '19',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '13',
        companyName: 'BlueSky Solutions',
        email: 'support@blueskysolutions.com',
        contactNo: '+1 5678901234',
        dateJoined: '10/01/2024',
        renewalDate: '11/01/2024',
        renewalAmount: '23.00',
        noOfUsers: '16',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '14',
        companyName: 'SecureSoft Technologies',
        email: 'info@securesofttech.com',
        contactNo: '+91 3456789012',
        dateJoined: '07/15/2024',
        renewalDate: '08/15/2024',
        renewalAmount: '26.00',
        noOfUsers: '21',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '15',
        companyName: 'DataTech Solutions',
        email: 'support@datatechsolutions.com',
        contactNo: '+44 6543210987',
        dateJoined: '02/20/2024',
        renewalDate: '03/20/2024',
        renewalAmount: '17.00',
        noOfUsers: '14',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '16',
        companyName: 'Visionary Systems',
        email: 'info@visionarysys.com',
        contactNo: '+1 2345678901',
        dateJoined: '09/10/2024',
        renewalDate: '10/10/2024',
        renewalAmount: '29.00',
        noOfUsers: '26',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '17',
        companyName: 'TechSavvy Solutions',
        email: 'support@techsavvysolutions.com',
        contactNo: '+91 8765432109',
        dateJoined: '06/05/2024',
        renewalDate: '07/05/2024',
        renewalAmount: '31.00',
        noOfUsers: '31',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '18',
        companyName: 'CloudWorks Technologies',
        email: 'info@cloudworkstech.com',
        contactNo: '+44 5678901234',
        dateJoined: '01/18/2024',
        renewalDate: '02/18/2024',
        renewalAmount: '14.00',
        noOfUsers: '11',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '19',
        companyName: 'SmartEdge Solutions',
        email: 'support@smartedgesolutions.com',
        contactNo: '+1 8765432109',
        dateJoined: '11/30/2024',
        renewalDate: '12/30/2024',
        renewalAmount: '32.00',
        noOfUsers: '27',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '20',
        companyName: 'InfoNet Systems',
        email: 'info@infonetsys.com',
        contactNo: '+91 2345678901',
        dateJoined: '08/15/2024',
        renewalDate: '09/15/2024',
        renewalAmount: '18.00',
        noOfUsers: '13',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '01',
        companyName: 'BrightHorizon Solutions',
        email: 'support@brighthorizonsolutions.com',
        contactNo: '+91 1234567890',
        dateJoined: '04/17/2024',
        renewalDate: '05/17/2024',
        renewalAmount: '20.00',
        noOfUsers: '25',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '02',
        companyName: 'TechNet Corp',
        email: 'info@technetcorp.com',
        contactNo: '+1 9876543210',
        dateJoined: '06/01/2024',
        renewalDate: '07/01/2024',
        renewalAmount: '25.00',
        noOfUsers: '30',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '03',
        companyName: 'GlobeTech Solutions',
        email: 'info@globetechsolutions.com',
        contactNo: '+44 1234567890',
        dateJoined: '03/15/2024',
        renewalDate: '04/15/2024',
        renewalAmount: '18.50',
        noOfUsers: '20',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '04',
        companyName: 'DataSoft Systems',
        email: 'support@datasoftsystems.com',
        contactNo: '+91 9876543210',
        dateJoined: '05/10/2024',
        renewalDate: '06/10/2024',
        renewalAmount: '22.50',
        noOfUsers: '15',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '05',
        companyName: 'InnoTech Solutions',
        email: 'support@innotechsolutions.com',
        contactNo: '+1 2345678901',
        dateJoined: '07/20/2024',
        renewalDate: '08/20/2024',
        renewalAmount: '30.00',
        noOfUsers: '18',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '06',
        companyName: 'GlobalSoft Ltd.',
        email: 'info@globalsftltd.com',
        contactNo: '+44 9876543210',
        dateJoined: '02/28/2024',
        renewalDate: '03/28/2024',
        renewalAmount: '15.00',
        noOfUsers: '12',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '07',
        companyName: 'EagleEye Technologies',
        email: 'info@eagleeyetech.com',
        contactNo: '+1 3456789012',
        dateJoined: '09/05/2024',
        renewalDate: '10/05/2024',
        renewalAmount: '28.00',
        noOfUsers: '22',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '08',
        companyName: 'CyberSafe Solutions',
        email: 'support@cybersafesolutions.com',
        contactNo: '+91 8765432109',
        dateJoined: '01/12/2024',
        renewalDate: '02/12/2024',
        renewalAmount: '19.50',
        noOfUsers: '28',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '09',
        companyName: 'Skyline Innovations',
        email: 'info@skylineinnovations.com',
        contactNo: '+44 5678901234',
        dateJoined: '11/15/2024',
        renewalDate: '12/15/2024',
        renewalAmount: '21.50',
        noOfUsers: '35',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '10',
        companyName: 'DataHub Systems',
        email: 'info@datahubsyst.com',
        contactNo: '+1 6543210987',
        dateJoined: '08/10/2024',
        renewalDate: '09/10/2024',
        renewalAmount: '24.50',
        noOfUsers: '17',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '11',
        companyName: 'TechBridge Solutions',
        email: 'support@techbridgesolutions.com',
        contactNo: '+91 2345678901',
        dateJoined: '05/25/2024',
        renewalDate: '06/25/2024',
        renewalAmount: '27.50',
        noOfUsers: '23',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '12',
        companyName: 'InnovaTech Services',
        email: 'info@innovatechsvc.com',
        contactNo: '+44 8765432109',
        dateJoined: '03/08/2024',
        renewalDate: '04/08/2024',
        renewalAmount: '16.50',
        noOfUsers: '19',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '13',
        companyName: 'BlueSky Solutions',
        email: 'support@blueskysolutions.com',
        contactNo: '+1 5678901234',
        dateJoined: '10/01/2024',
        renewalDate: '11/01/2024',
        renewalAmount: '23.00',
        noOfUsers: '16',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '14',
        companyName: 'SecureSoft Technologies',
        email: 'info@securesofttech.com',
        contactNo: '+91 3456789012',
        dateJoined: '07/15/2024',
        renewalDate: '08/15/2024',
        renewalAmount: '26.00',
        noOfUsers: '21',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '15',
        companyName: 'DataTech Solutions',
        email: 'support@datatechsolutions.com',
        contactNo: '+44 6543210987',
        dateJoined: '02/20/2024',
        renewalDate: '03/20/2024',
        renewalAmount: '17.00',
        noOfUsers: '14',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '16',
        companyName: 'Visionary Systems',
        email: 'info@visionarysys.com',
        contactNo: '+1 2345678901',
        dateJoined: '09/10/2024',
        renewalDate: '10/10/2024',
        renewalAmount: '29.00',
        noOfUsers: '26',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '17',
        companyName: 'TechSavvy Solutions',
        email: 'support@techsavvysolutions.com',
        contactNo: '+91 8765432109',
        dateJoined: '06/05/2024',
        renewalDate: '07/05/2024',
        renewalAmount: '31.00',
        noOfUsers: '31',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '18',
        companyName: 'CloudWorks Technologies',
        email: 'info@cloudworkstech.com',
        contactNo: '+44 5678901234',
        dateJoined: '01/18/2024',
        renewalDate: '02/18/2024',
        renewalAmount: '14.00',
        noOfUsers: '11',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '19',
        companyName: 'SmartEdge Solutions',
        email: 'support@smartedgesolutions.com',
        contactNo: '+1 8765432109',
        dateJoined: '11/30/2024',
        renewalDate: '12/30/2024',
        renewalAmount: '32.00',
        noOfUsers: '27',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '20',
        companyName: 'InfoNet Systems',
        email: 'info@infonetsys.com',
        contactNo: '+91 2345678901',
        dateJoined: '08/15/2024',
        renewalDate: '09/15/2024',
        renewalAmount: '18.00',
        noOfUsers: '13',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '01',
        companyName: 'BrightHorizon Solutions',
        email: 'support@brighthorizonsolutions.com',
        contactNo: '+91 1234567890',
        dateJoined: '04/17/2024',
        renewalDate: '05/17/2024',
        renewalAmount: '20.00',
        noOfUsers: '25',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '02',
        companyName: 'TechNet Corp',
        email: 'info@technetcorp.com',
        contactNo: '+1 9876543210',
        dateJoined: '06/01/2024',
        renewalDate: '07/01/2024',
        renewalAmount: '25.00',
        noOfUsers: '30',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '03',
        companyName: 'GlobeTech Solutions',
        email: 'info@globetechsolutions.com',
        contactNo: '+44 1234567890',
        dateJoined: '03/15/2024',
        renewalDate: '04/15/2024',
        renewalAmount: '18.50',
        noOfUsers: '20',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '04',
        companyName: 'DataSoft Systems',
        email: 'support@datasoftsystems.com',
        contactNo: '+91 9876543210',
        dateJoined: '05/10/2024',
        renewalDate: '06/10/2024',
        renewalAmount: '22.50',
        noOfUsers: '15',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '05',
        companyName: 'InnoTech Solutions',
        email: 'support@innotechsolutions.com',
        contactNo: '+1 2345678901',
        dateJoined: '07/20/2024',
        renewalDate: '08/20/2024',
        renewalAmount: '30.00',
        noOfUsers: '18',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '06',
        companyName: 'GlobalSoft Ltd.',
        email: 'info@globalsftltd.com',
        contactNo: '+44 9876543210',
        dateJoined: '02/28/2024',
        renewalDate: '03/28/2024',
        renewalAmount: '15.00',
        noOfUsers: '12',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '07',
        companyName: 'EagleEye Technologies',
        email: 'info@eagleeyetech.com',
        contactNo: '+1 3456789012',
        dateJoined: '09/05/2024',
        renewalDate: '10/05/2024',
        renewalAmount: '28.00',
        noOfUsers: '22',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '08',
        companyName: 'CyberSafe Solutions',
        email: 'support@cybersafesolutions.com',
        contactNo: '+91 8765432109',
        dateJoined: '01/12/2024',
        renewalDate: '02/12/2024',
        renewalAmount: '19.50',
        noOfUsers: '28',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '09',
        companyName: 'Skyline Innovations',
        email: 'info@skylineinnovations.com',
        contactNo: '+44 5678901234',
        dateJoined: '11/15/2024',
        renewalDate: '12/15/2024',
        renewalAmount: '21.50',
        noOfUsers: '35',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '10',
        companyName: 'DataHub Systems',
        email: 'info@datahubsyst.com',
        contactNo: '+1 6543210987',
        dateJoined: '08/10/2024',
        renewalDate: '09/10/2024',
        renewalAmount: '24.50',
        noOfUsers: '17',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '11',
        companyName: 'TechBridge Solutions',
        email: 'support@techbridgesolutions.com',
        contactNo: '+91 2345678901',
        dateJoined: '05/25/2024',
        renewalDate: '06/25/2024',
        renewalAmount: '27.50',
        noOfUsers: '23',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '12',
        companyName: 'InnovaTech Services',
        email: 'info@innovatechsvc.com',
        contactNo: '+44 8765432109',
        dateJoined: '03/08/2024',
        renewalDate: '04/08/2024',
        renewalAmount: '16.50',
        noOfUsers: '19',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '13',
        companyName: 'BlueSky Solutions',
        email: 'support@blueskysolutions.com',
        contactNo: '+1 5678901234',
        dateJoined: '10/01/2024',
        renewalDate: '11/01/2024',
        renewalAmount: '23.00',
        noOfUsers: '16',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '14',
        companyName: 'SecureSoft Technologies',
        email: 'info@securesofttech.com',
        contactNo: '+91 3456789012',
        dateJoined: '07/15/2024',
        renewalDate: '08/15/2024',
        renewalAmount: '26.00',
        noOfUsers: '21',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '15',
        companyName: 'DataTech Solutions',
        email: 'support@datatechsolutions.com',
        contactNo: '+44 6543210987',
        dateJoined: '02/20/2024',
        renewalDate: '03/20/2024',
        renewalAmount: '17.00',
        noOfUsers: '14',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '16',
        companyName: 'Visionary Systems',
        email: 'info@visionarysys.com',
        contactNo: '+1 2345678901',
        dateJoined: '09/10/2024',
        renewalDate: '10/10/2024',
        renewalAmount: '29.00',
        noOfUsers: '26',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '17',
        companyName: 'TechSavvy Solutions',
        email: 'support@techsavvysolutions.com',
        contactNo: '+91 8765432109',
        dateJoined: '06/05/2024',
        renewalDate: '07/05/2024',
        renewalAmount: '31.00',
        noOfUsers: '31',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '18',
        companyName: 'CloudWorks Technologies',
        email: 'info@cloudworkstech.com',
        contactNo: '+44 5678901234',
        dateJoined: '01/18/2024',
        renewalDate: '02/18/2024',
        renewalAmount: '14.00',
        noOfUsers: '11',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '19',
        companyName: 'SmartEdge Solutions',
        email: 'support@smartedgesolutions.com',
        contactNo: '+1 8765432109',
        dateJoined: '11/30/2024',
        renewalDate: '12/30/2024',
        renewalAmount: '32.00',
        noOfUsers: '27',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '20',
        companyName: 'InfoNet Systems',
        email: 'info@infonetsys.com',
        contactNo: '+91 2345678901',
        dateJoined: '08/15/2024',
        renewalDate: '09/15/2024',
        renewalAmount: '18.00',
        noOfUsers: '13',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '01',
        companyName: 'BrightHorizon Solutions',
        email: 'support@brighthorizonsolutions.com',
        contactNo: '+91 1234567890',
        dateJoined: '04/17/2024',
        renewalDate: '05/17/2024',
        renewalAmount: '20.00',
        noOfUsers: '25',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '02',
        companyName: 'TechNet Corp',
        email: 'info@technetcorp.com',
        contactNo: '+1 9876543210',
        dateJoined: '06/01/2024',
        renewalDate: '07/01/2024',
        renewalAmount: '25.00',
        noOfUsers: '30',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '03',
        companyName: 'GlobeTech Solutions',
        email: 'info@globetechsolutions.com',
        contactNo: '+44 1234567890',
        dateJoined: '03/15/2024',
        renewalDate: '04/15/2024',
        renewalAmount: '18.50',
        noOfUsers: '20',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '04',
        companyName: 'DataSoft Systems',
        email: 'support@datasoftsystems.com',
        contactNo: '+91 9876543210',
        dateJoined: '05/10/2024',
        renewalDate: '06/10/2024',
        renewalAmount: '22.50',
        noOfUsers: '15',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '05',
        companyName: 'InnoTech Solutions',
        email: 'support@innotechsolutions.com',
        contactNo: '+1 2345678901',
        dateJoined: '07/20/2024',
        renewalDate: '08/20/2024',
        renewalAmount: '30.00',
        noOfUsers: '18',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '06',
        companyName: 'GlobalSoft Ltd.',
        email: 'info@globalsftltd.com',
        contactNo: '+44 9876543210',
        dateJoined: '02/28/2024',
        renewalDate: '03/28/2024',
        renewalAmount: '15.00',
        noOfUsers: '12',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '07',
        companyName: 'EagleEye Technologies',
        email: 'info@eagleeyetech.com',
        contactNo: '+1 3456789012',
        dateJoined: '09/05/2024',
        renewalDate: '10/05/2024',
        renewalAmount: '28.00',
        noOfUsers: '22',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '08',
        companyName: 'CyberSafe Solutions',
        email: 'support@cybersafesolutions.com',
        contactNo: '+91 8765432109',
        dateJoined: '01/12/2024',
        renewalDate: '02/12/2024',
        renewalAmount: '19.50',
        noOfUsers: '28',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '09',
        companyName: 'Skyline Innovations',
        email: 'info@skylineinnovations.com',
        contactNo: '+44 5678901234',
        dateJoined: '11/15/2024',
        renewalDate: '12/15/2024',
        renewalAmount: '21.50',
        noOfUsers: '35',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '10',
        companyName: 'DataHub Systems',
        email: 'info@datahubsyst.com',
        contactNo: '+1 6543210987',
        dateJoined: '08/10/2024',
        renewalDate: '09/10/2024',
        renewalAmount: '24.50',
        noOfUsers: '17',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '11',
        companyName: 'TechBridge Solutions',
        email: 'support@techbridgesolutions.com',
        contactNo: '+91 2345678901',
        dateJoined: '05/25/2024',
        renewalDate: '06/25/2024',
        renewalAmount: '27.50',
        noOfUsers: '23',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '12',
        companyName: 'InnovaTech Services',
        email: 'info@innovatechsvc.com',
        contactNo: '+44 8765432109',
        dateJoined: '03/08/2024',
        renewalDate: '04/08/2024',
        renewalAmount: '16.50',
        noOfUsers: '19',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '13',
        companyName: 'BlueSky Solutions',
        email: 'support@blueskysolutions.com',
        contactNo: '+1 5678901234',
        dateJoined: '10/01/2024',
        renewalDate: '11/01/2024',
        renewalAmount: '23.00',
        noOfUsers: '16',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '14',
        companyName: 'SecureSoft Technologies',
        email: 'info@securesofttech.com',
        contactNo: '+91 3456789012',
        dateJoined: '07/15/2024',
        renewalDate: '08/15/2024',
        renewalAmount: '26.00',
        noOfUsers: '21',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '15',
        companyName: 'DataTech Solutions',
        email: 'support@datatechsolutions.com',
        contactNo: '+44 6543210987',
        dateJoined: '02/20/2024',
        renewalDate: '03/20/2024',
        renewalAmount: '17.00',
        noOfUsers: '14',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '16',
        companyName: 'Visionary Systems',
        email: 'info@visionarysys.com',
        contactNo: '+1 2345678901',
        dateJoined: '09/10/2024',
        renewalDate: '10/10/2024',
        renewalAmount: '29.00',
        noOfUsers: '26',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '17',
        companyName: 'TechSavvy Solutions',
        email: 'support@techsavvysolutions.com',
        contactNo: '+91 8765432109',
        dateJoined: '06/05/2024',
        renewalDate: '07/05/2024',
        renewalAmount: '31.00',
        noOfUsers: '31',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '18',
        companyName: 'CloudWorks Technologies',
        email: 'info@cloudworkstech.com',
        contactNo: '+44 5678901234',
        dateJoined: '01/18/2024',
        renewalDate: '02/18/2024',
        renewalAmount: '14.00',
        noOfUsers: '11',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '19',
        companyName: 'SmartEdge Solutions',
        email: 'support@smartedgesolutions.com',
        contactNo: '+1 8765432109',
        dateJoined: '11/30/2024',
        renewalDate: '12/30/2024',
        renewalAmount: '32.00',
        noOfUsers: '27',
        status: 'Active',
        action: 'Edit',
    },
    {
        srNo: '20',
        companyName: 'InfoNet Systems',
        email: 'info@infonetsys.com',
        contactNo: '+91 2345678901',
        dateJoined: '08/15/2024',
        renewalDate: '09/15/2024',
        renewalAmount: '18.00',
        noOfUsers: '13',
        status: 'Active',
        action: 'Edit',
    },
];

const columns = [
    {
        accessorKey: 'srNo',
        header: 'Sr.No',
    },
    {
        accessorKey: 'companyName',
        header: 'Company Name',
    },
    {
        accessorKey: 'email',
        header: 'Email Address',
    },
    {
        accessorKey: 'contactNo',
        header: 'Contact No.',
    },
    {
        accessorKey: 'dateJoined',
        header: ({ column }) => (
            <button
                className="inline-flex items-center justify-center whitespace-nowrap outline-none"
                onClick={() =>
                    column.toggleSorting(column.getIsSorted() === 'asc')
                }
            >
                Date Joined
                <UpDownArrowIcon
                    width={'15'}
                    height={'15'}
                    className="ml-1 size-[15px] fill-b5"
                />
            </button>
        ),
    },
    {
        accessorKey: 'renewalDate',
        header: ({ column }) => (
            <button
                className="inline-flex items-center justify-center whitespace-nowrap outline-none"
                onClick={() =>
                    column.toggleSorting(column.getIsSorted() === 'asc')
                }
            >
                Renewal Date
                <UpDownArrowIcon
                    width={'15'}
                    height={'15'}
                    className="ml-1 size-[15px] fill-b5"
                />
            </button>
        ),
    },
    {
        accessorKey: 'renewalAmount',
        header: ({ column }) => (
            <button
                className="inline-flex items-center justify-center whitespace-nowrap outline-none"
                onClick={() =>
                    column.toggleSorting(column.getIsSorted() === 'asc')
                }
            >
                Renewal Amount
                <UpDownArrowIcon
                    width={'15'}
                    height={'15'}
                    className="ml-1 size-[15px] fill-b5"
                />
            </button>
        ),
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue('renewalAmount'));
            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
            }).format(amount);
            return <span>{formatted}</span>;
        },
    },
    {
        accessorKey: 'noOfUsers',
        header: ({ column }) => (
            <button
                className="inline-flex items-center justify-center whitespace-nowrap outline-none"
                onClick={() =>
                    column.toggleSorting(column.getIsSorted() === 'asc')
                }
            >
                No. of Users
                <UpDownArrowIcon
                    width={'15'}
                    height={'15'}
                    className="ml-1 size-[15px] fill-b5"
                />
            </button>
        ),
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => (
            <span
                className={
                    getValue() === 'Active'
                        ? 'text-green'
                        : getValue() === 'Expired'
                        ? 'text-reddark'
                        : 'text-orange'
                }
            >
                {getValue()}
            </span>
        ),
    },
    {
        accessorKey: 'action',
        header: 'Action',
        cell: ({ row }) => (
            <button
                className="btn btn-lightblue p-[7px]"
                onClick={() => handleEdit(row.original)}
            >
                <EditIcon width={'14'} height={'14'} className={'size-3.5'} />
            </button>
        ),
    },
];

const CompanyListTable = () => {
    const [columnFilters, setColumnFilters] = useState([]);
    const [sorting, setSorting] = useState([]);
    const [filterInput, setFilterInput] = useState('');
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });

      const handleFilterChange = e => {
        const value = e.target.value || '';
        setColumnFilters([{ id: 'companyName', value }]);
        setFilterInput(value);
    };

    const handlePageSizeChange = (pageSize) => {
        setPagination((old) => ({ ...old, pageSize }));
    };

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnFilters,
            pagination,
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <div className="flex flex-col w-full">
            <div className="flex items-center justify-between mb-5">
                <DataTableSearch placeholder={"Search Company Name"}  handleFilterChange={handleFilterChange} value={filterInput}/>
                <div className="flex space-x-2">
                    <DataTablePageSizeSelector
                        pagination={pagination}
                        handlePageSizeChange={handlePageSizeChange}
                    />
                    <button className="ml-auto btn btn-outline-gray">
                        Export Data
                    </button>
                </div>
            </div>
            <Datatable table={table} />
            <DataTablePagination
                table={table}
                pagination={pagination}
                handlePageSizeChange={handlePageSizeChange}
            />
        </div>
    );
};

export default CompanyListTable;
