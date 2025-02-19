function VideoStream() {
  return (
    <div className='relative aspect-video w-full'>
      <iframe
        className='h-full w-full'
        src='http://10.10.10.10:8889/cam'
        allow='autoplay'
      />
    </div>
  );
}

export { VideoStream };
