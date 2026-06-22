using System;

namespace WMS.Domain.Exceptions
{
    public class OcrParsingException : Exception
    {
        public OcrParsingException() { }

        public OcrParsingException(string message) : base(message) { }

        public OcrParsingException(string message, Exception innerException) : base(message, innerException) { }
    }
}
