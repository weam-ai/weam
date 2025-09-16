import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const { messageId, updatedResponse } = await request.json();

    if (!messageId || !updatedResponse) {
      return NextResponse.json(
        { error: 'Message ID and updated response are required' },
        { status: 400 }
      );
    }

    // Here you would typically update the response in your database
    // For example:
    // await updateMessageResponse(messageId, updatedResponse);
    
    // For now, we'll just return a success response
    console.log('Updating response:', { messageId, updatedResponse });

    return NextResponse.json(
      { 
        success: true, 
        message: 'Response updated successfully',
        data: { messageId, updatedResponse }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error updating response:', error);
    return NextResponse.json(
      { error: 'Failed to update response' },
      { status: 500 }
    );
  }
} 